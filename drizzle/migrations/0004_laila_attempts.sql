CREATE TABLE public.laila_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('quiz','essay')),
  stage text,
  level text,
  subject text,
  difficulty text,
  question_count integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.laila_attempts TO authenticated;
GRANT ALL ON public.laila_attempts TO service_role;

ALTER TABLE public.laila_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY laila_attempts_select_own
  ON public.laila_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY laila_attempts_insert_own
  ON public.laila_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX laila_attempts_user_created_idx
  ON public.laila_attempts (user_id, created_at DESC);