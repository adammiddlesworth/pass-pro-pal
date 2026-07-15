
CREATE TABLE public.ghl_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger text NOT NULL CHECK (trigger IN ('cron','manual','signin')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  processed int NOT NULL DEFAULT 0,
  succeeded int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  skipped int NOT NULL DEFAULT 0,
  duration_ms int NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  truncated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ghl_sync_runs TO authenticated;
GRANT ALL ON public.ghl_sync_runs TO service_role;

ALTER TABLE public.ghl_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view GHL sync runs"
  ON public.ghl_sync_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX ghl_sync_runs_started_at_idx ON public.ghl_sync_runs (started_at DESC);
