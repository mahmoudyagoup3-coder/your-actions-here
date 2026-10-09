ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS curriculum_type text;

ALTER TABLE public.materials
  ADD CONSTRAINT materials_curriculum_type_check
  CHECK (curriculum_type IS NULL OR curriculum_type IN ('new','old'));

CREATE INDEX IF NOT EXISTS materials_stage_level_curriculum_idx
  ON public.materials (stage, level, curriculum_type);

CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('public.claim_admin'));
  DELETE FROM public.user_roles ur
   WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ur.user_id);
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$function$;

DROP POLICY IF EXISTS "admins upload materials bucket" ON storage.objects;
CREATE POLICY "admins upload materials bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'materials'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
  AND lower(right(name, 4)) = '.pdf'
);

DROP POLICY IF EXISTS "admins update materials bucket" ON storage.objects;
CREATE POLICY "admins update materials bucket"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (
  bucket_id = 'materials'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
  AND lower(right(name, 4)) = '.pdf'
);