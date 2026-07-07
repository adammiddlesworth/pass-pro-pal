
CREATE POLICY "Admins can view all questions"
ON public.questions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all answers"
ON public.answers
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
