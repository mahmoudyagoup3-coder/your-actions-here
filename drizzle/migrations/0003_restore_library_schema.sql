DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='app_role' AND typnamespace='public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('admin','user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.library_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage text NOT NULL,
  level text NOT NULL,
  subject text NOT NULL,
  curriculum_type text,
  kind text NOT NULL DEFAULT 'book',
  title text NOT NULL,
  description text,
  unit text,
  video_url text,
  file_path text,
  file_name text,
  file_size bigint,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT library_materials_kind_check CHECK (kind IN ('book','note','worksheet','course')),
  CONSTRAINT library_materials_curriculum_type_check CHECK (curriculum_type IS NULL OR curriculum_type IN ('new','old')),
  CONSTRAINT library_materials_source_check CHECK ((kind = 'course' AND (video_url IS NOT NULL OR file_path IS NOT NULL)) OR (kind <> 'course' AND file_path IS NOT NULL)),
  CONSTRAINT library_materials_old_books_only_check CHECK (curriculum_type IS DISTINCT FROM 'old' OR kind = 'book'),
  CONSTRAINT library_materials_video_https_check CHECK (video_url IS NULL OR video_url LIKE 'https://%')
);
GRANT SELECT ON public.library_materials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_materials TO authenticated;
GRANT ALL ON public.library_materials TO service_role;
ALTER TABLE public.library_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read library materials" ON public.library_materials;
DROP POLICY IF EXISTS "admins insert library materials" ON public.library_materials;
DROP POLICY IF EXISTS "admins update library materials" ON public.library_materials;
DROP POLICY IF EXISTS "admins delete library materials" ON public.library_materials;
CREATE POLICY "anyone can read library materials" ON public.library_materials FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins insert library materials" ON public.library_materials FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update library materials" ON public.library_materials FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete library materials" ON public.library_materials FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS library_materials_stage_level_idx ON public.library_materials (stage, level);
CREATE INDEX IF NOT EXISTS library_materials_stage_level_curriculum_idx ON public.library_materials (stage, level, curriculum_type);

DROP TRIGGER IF EXISTS library_materials_updated_at ON public.library_materials;
CREATE TRIGGER library_materials_updated_at BEFORE UPDATE ON public.library_materials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "read materials bucket" ON storage.objects;
DROP POLICY IF EXISTS "admins upload materials bucket" ON storage.objects;
DROP POLICY IF EXISTS "admins update materials bucket" ON storage.objects;
DROP POLICY IF EXISTS "admins delete materials bucket" ON storage.objects;
CREATE POLICY "read materials bucket" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'materials');
CREATE POLICY "admins upload materials bucket" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update materials bucket" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete materials bucket" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.claim_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;