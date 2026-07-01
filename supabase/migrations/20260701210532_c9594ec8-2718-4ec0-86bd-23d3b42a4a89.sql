
ALTER TYPE exam_status ADD VALUE IF NOT EXISTS 'archived';

ALTER TABLE public.user_attempts
  ADD COLUMN IF NOT EXISTS attempt_type text NOT NULL DEFAULT 'exam';

DO $$ BEGIN
  ALTER TABLE public.user_attempts
    ADD CONSTRAINT user_attempts_attempt_type_check
    CHECK (attempt_type IN ('exam', 'review'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.user_attempts
  ALTER COLUMN exam_id DROP NOT NULL;
