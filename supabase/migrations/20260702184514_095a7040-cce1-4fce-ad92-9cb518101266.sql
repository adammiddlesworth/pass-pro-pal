-- Auto-maintain exams.question_count when questions change.
CREATE OR REPLACE FUNCTION public.recount_exam_questions()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_exam uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    target_exam := OLD.exam_id;
  ELSE
    target_exam := NEW.exam_id;
  END IF;

  UPDATE public.exams
  SET question_count = (
    SELECT COUNT(*) FROM public.questions WHERE exam_id = target_exam
  )
  WHERE id = target_exam;

  IF (TG_OP = 'UPDATE' AND OLD.exam_id IS DISTINCT FROM NEW.exam_id) THEN
    UPDATE public.exams
    SET question_count = (
      SELECT COUNT(*) FROM public.questions WHERE exam_id = OLD.exam_id
    )
    WHERE id = OLD.exam_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_questions_recount ON public.questions;
CREATE TRIGGER trg_questions_recount
AFTER INSERT OR DELETE OR UPDATE OF exam_id ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.recount_exam_questions();

-- Backfill existing counts.
UPDATE public.exams e
SET question_count = COALESCE(sub.c, 0)
FROM (
  SELECT exam_id, COUNT(*)::int AS c FROM public.questions GROUP BY exam_id
) sub
WHERE e.id = sub.exam_id;

UPDATE public.exams
SET question_count = 0
WHERE id NOT IN (SELECT DISTINCT exam_id FROM public.questions WHERE exam_id IS NOT NULL);
