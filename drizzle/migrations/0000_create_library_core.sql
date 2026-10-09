CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  DELETE FROM public.user_roles ur
   WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ur.user_id);
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    WHERE ur.role = 'admin'
  )
$$;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage text NOT NULL,
  level text NOT NULL,
  subject text NOT NULL,
  kind text NOT NULL DEFAULT 'book',
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text,
  file_size bigint,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT materials_curriculum_check CHECK (
    (stage = 'preparatory' AND level = 'term-6' AND kind IN ('book','note'))
    OR (stage = 'middle' AND level IN ('grade-1','grade-2') AND kind = 'book')
    OR (stage = 'middle' AND level = 'grade-3' AND kind IN ('book','note'))
    OR (stage = 'secondary' AND level IN ('grade-1','grade-2') AND kind = 'book')
    OR (stage = 'secondary' AND level = 'grade-3' AND kind IN ('book','note'))
  )
);

CREATE INDEX materials_stage_level_idx ON public.materials (stage, level);

GRANT SELECT ON public.materials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read materials" ON public.materials
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admins insert materials" ON public.materials
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update materials" ON public.materials
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete materials" ON public.materials
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER materials_updated_at BEFORE UPDATE ON public.materials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "public read materials bucket" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'materials');

CREATE POLICY "admins upload materials bucket" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update materials bucket" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete materials bucket" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.claim_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;