
-- Tighten SELECT on questions/answers: only sample-exam rows are directly readable.
-- Non-sample content must be fetched via server code using the service role.

DROP POLICY IF EXISTS "Questions are publicly readable" ON public.questions;
DROP POLICY IF EXISTS "Answers are publicly readable" ON public.answers;

CREATE POLICY "Sample exam questions are publicly readable"
ON public.questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = questions.exam_id
      AND e.is_sample = true
  )
);

CREATE POLICY "Sample exam answers are publicly readable"
ON public.answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
      FROM public.questions q
      JOIN public.exams e ON e.id = q.exam_id
     WHERE q.id = answers.question_id
       AND e.is_sample = true
  )
);
