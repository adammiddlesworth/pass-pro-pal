ALTER TABLE public.exams ADD COLUMN is_diagnostic boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX exams_one_diagnostic_per_category ON public.exams (category) WHERE is_diagnostic;