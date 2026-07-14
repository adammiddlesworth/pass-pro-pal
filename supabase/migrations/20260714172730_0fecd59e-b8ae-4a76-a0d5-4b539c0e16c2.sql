DROP POLICY IF EXISTS "Exams are publicly readable" ON public.exams;
CREATE POLICY "Published exams are publicly readable" ON public.exams FOR SELECT TO public USING (status = 'published');
CREATE POLICY "Admins can view all exams" ON public.exams FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));