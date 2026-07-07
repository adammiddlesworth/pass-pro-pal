
-- Extend attempt_type to include 'weekly'
ALTER TABLE public.user_attempts DROP CONSTRAINT IF EXISTS user_attempts_attempt_type_check;
ALTER TABLE public.user_attempts ADD CONSTRAINT user_attempts_attempt_type_check
  CHECK (attempt_type = ANY (ARRAY['exam'::text, 'review'::text, 'weekly'::text]));

-- weekly_mixes: one row per week
CREATE TABLE public.weekly_mixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.weekly_mixes TO anon, authenticated;
GRANT ALL ON public.weekly_mixes TO service_role;

ALTER TABLE public.weekly_mixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weekly mixes are publicly readable"
  ON public.weekly_mixes FOR SELECT USING (true);

-- weekly_mix_questions: the questions in each week's mix
CREATE TABLE public.weekly_mix_questions (
  mix_id uuid NOT NULL REFERENCES public.weekly_mixes(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  order_index int NOT NULL,
  wrong_rate numeric,
  PRIMARY KEY (mix_id, question_id)
);

CREATE INDEX weekly_mix_questions_mix_order_idx
  ON public.weekly_mix_questions (mix_id, order_index);

GRANT SELECT ON public.weekly_mix_questions TO anon, authenticated;
GRANT ALL ON public.weekly_mix_questions TO service_role;

ALTER TABLE public.weekly_mix_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weekly mix questions are publicly readable"
  ON public.weekly_mix_questions FOR SELECT USING (true);

-- Link user_attempts to a weekly mix (nullable — only set for weekly attempts)
ALTER TABLE public.user_attempts
  ADD COLUMN weekly_mix_id uuid REFERENCES public.weekly_mixes(id) ON DELETE SET NULL;

CREATE INDEX user_attempts_weekly_mix_idx
  ON public.user_attempts (weekly_mix_id, user_id)
  WHERE weekly_mix_id IS NOT NULL;

-- Function that builds the mix for a given Monday.
-- Ranks published questions by global wrong-rate over the last 30 days,
-- requires a minimum sample size, backfills if fewer than 30 clear the floor.
CREATE OR REPLACE FUNCTION public.generate_weekly_mix(target_week_start date DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wk date;
  mix uuid;
BEGIN
  wk := COALESCE(
    target_week_start,
    (date_trunc('week', now() AT TIME ZONE 'UTC'))::date
  );

  -- Idempotent: if a mix for this week already exists, return it.
  SELECT id INTO mix FROM public.weekly_mixes WHERE week_start = wk;
  IF mix IS NOT NULL THEN
    RETURN mix;
  END IF;

  INSERT INTO public.weekly_mixes(week_start) VALUES (wk) RETURNING id INTO mix;

  WITH stats AS (
    SELECT
      ua.question_id,
      COUNT(*) FILTER (WHERE ua.is_correct = false) AS wrong,
      COUNT(*)                                     AS total
    FROM public.user_answers ua
    JOIN public.questions q ON q.id = ua.question_id
    JOIN public.exams    e ON e.id = q.exam_id
    WHERE ua.answered_at >= now() - interval '30 days'
      AND e.status = 'published'
    GROUP BY ua.question_id
  ),
  ranked AS (
    SELECT
      s.question_id,
      (s.wrong::numeric / NULLIF(s.total, 0)) AS wrong_rate,
      s.total,
      -- Prefer questions with enough samples first, then rank by wrong-rate.
      (s.total >= 20) AS meets_floor
    FROM stats s
    WHERE s.wrong > 0
    ORDER BY meets_floor DESC, wrong_rate DESC NULLS LAST, s.total DESC
    LIMIT 30
  )
  INSERT INTO public.weekly_mix_questions (mix_id, question_id, order_index, wrong_rate)
  SELECT mix, r.question_id, row_number() OVER () - 1, r.wrong_rate
  FROM ranked r;

  RETURN mix;
END;
$$;

-- Kick off the first mix immediately so the feature has data on day one.
SELECT public.generate_weekly_mix();

-- Schedule weekly rotation: Mondays at 00:05 UTC.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-weekly-mix') THEN
    PERFORM cron.unschedule('generate-weekly-mix');
  END IF;
END $$;

SELECT cron.schedule(
  'generate-weekly-mix',
  '5 0 * * 1',
  $$ SELECT public.generate_weekly_mix(); $$
);
