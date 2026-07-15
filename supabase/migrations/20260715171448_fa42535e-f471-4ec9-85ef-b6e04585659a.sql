
DROP POLICY IF EXISTS "Weekly mixes are viewable by everyone" ON public.weekly_mixes;
DROP POLICY IF EXISTS "Public read weekly mixes" ON public.weekly_mixes;
DROP POLICY IF EXISTS "weekly_mixes_select" ON public.weekly_mixes;
DROP POLICY IF EXISTS "Anyone can view weekly mixes" ON public.weekly_mixes;
DROP POLICY IF EXISTS "Weekly mix questions are viewable by everyone" ON public.weekly_mix_questions;
DROP POLICY IF EXISTS "Public read weekly mix questions" ON public.weekly_mix_questions;
DROP POLICY IF EXISTS "weekly_mix_questions_select" ON public.weekly_mix_questions;
DROP POLICY IF EXISTS "Anyone can view weekly mix questions" ON public.weekly_mix_questions;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='weekly_mixes' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY %I ON public.weekly_mixes', r.policyname);
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='weekly_mix_questions' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY %I ON public.weekly_mix_questions', r.policyname);
  END LOOP;
END $$;

REVOKE SELECT ON public.weekly_mixes FROM anon;
REVOKE SELECT ON public.weekly_mix_questions FROM anon;
GRANT SELECT ON public.weekly_mixes TO authenticated;
GRANT SELECT ON public.weekly_mix_questions TO authenticated;

CREATE POLICY "Authenticated users can view weekly mixes"
  ON public.weekly_mixes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view weekly mix questions"
  ON public.weekly_mix_questions FOR SELECT TO authenticated USING (true);
