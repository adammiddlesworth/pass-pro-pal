ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS is_timed_final boolean NOT NULL DEFAULT false;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS time_limit_minutes integer;