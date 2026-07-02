CREATE UNIQUE INDEX IF NOT EXISTS user_answers_attempt_question_uidx
  ON public.user_answers (attempt_id, question_id);

CREATE INDEX IF NOT EXISTS user_attempts_in_progress_idx
  ON public.user_attempts (user_id, exam_id)
  WHERE completed_at IS NULL;