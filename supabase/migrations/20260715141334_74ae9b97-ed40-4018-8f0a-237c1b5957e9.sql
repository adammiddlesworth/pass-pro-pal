ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ghl_sync_status text,
  ADD COLUMN IF NOT EXISTS ghl_contact_id text,
  ADD COLUMN IF NOT EXISTS ghl_last_error text,
  ADD COLUMN IF NOT EXISTS ghl_last_synced_at timestamptz;