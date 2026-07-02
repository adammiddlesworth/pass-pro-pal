
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS youtube_video_id text,
  ADD COLUMN IF NOT EXISTS exam_number integer;

CREATE TABLE IF NOT EXISTS public.exam_tags (
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, tag)
);

GRANT SELECT ON public.exam_tags TO anon, authenticated;
GRANT ALL ON public.exam_tags TO service_role;

ALTER TABLE public.exam_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exam tags are publicly readable"
  ON public.exam_tags FOR SELECT
  USING (true);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS exams_category_status_idx
  ON public.exams (category, status);
CREATE INDEX IF NOT EXISTS exams_title_trgm_idx
  ON public.exams USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS exam_tags_tag_idx
  ON public.exam_tags (tag);
CREATE INDEX IF NOT EXISTS user_attempts_user_started_idx
  ON public.user_attempts (user_id, started_at DESC);
