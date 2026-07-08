ALTER TABLE public.user_attempts DROP CONSTRAINT user_attempts_attempt_type_check;
ALTER TABLE public.user_attempts ADD CONSTRAINT user_attempts_attempt_type_check
  CHECK (attempt_type = ANY (ARRAY['exam'::text, 'review'::text, 'weekly'::text, 'diagnostic'::text]));