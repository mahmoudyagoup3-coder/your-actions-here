CREATE TABLE public.library_materials (
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
  CONSTRAINT library_materials_source_check CHECK (
    (kind = 'course' AND (video_url IS NOT NULL OR file_path IS NOT NULL))
    OR (kind <> 'course' AND file_path IS NOT NULL)
  ),
  CONSTRAINT library_materials_old_books_only_check CHECK (curriculum_type IS DISTINCT FROM 'old' OR kind = 'book')
);

GRANT SELECT ON public.library_materials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_materials TO authenticated;
GRANT ALL ON public.library_materials TO service_role;

ALTER TABLE public.library_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read library materials" ON public.library_materials
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins insert library materials" ON public.library_materials
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update library materials" ON public.library_materials
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete library materials" ON public.library_materials
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX library_materials_stage_level_idx ON public.library_materials (stage, level);
CREATE INDEX library_materials_stage_level_curriculum_idx ON public.library_materials (stage, level, curriculum_type);

CREATE TRIGGER library_materials_updated_at BEFORE UPDATE ON public.library_materials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.materials IS 'DEPRECATED: replaced by public.library_materials for the complete curriculum model';