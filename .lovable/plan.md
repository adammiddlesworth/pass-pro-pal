## Goal

Give admins a `/admin/ghl-sync` page that shows recent GHL sync runs (nightly cron + on-demand) with per-contact success/failure and the exact error string returned by GHL (e.g. the 401 scope message).

## Data model — new table

`public.ghl_sync_runs`
- `trigger` text — `'cron'` | `'manual'` | `'signin'`
- `started_at`, `finished_at` timestamptz
- `processed`, `succeeded`, `failed`, `skipped` int
- `errors` jsonb — array of `{ user_id, email, error }`; capped to first 100 to keep rows small
- RLS: admins-only SELECT via `has_role(auth.uid(),'admin')`; no client INSERT (writes come from `supabaseAdmin`).

## Instrumentation

Update `src/lib/ghl-cron.server.ts`:
- `syncUserToGhl` returns `{ ok, error?, email? }` instead of `boolean`, surfacing the exact `upsertResult.error` string.
- `runNightlyGhlSync(trigger)` collects failures and writes one row into `ghl_sync_runs` at the end (best-effort; a logging failure never blocks the sync).

Update callers so the run source is recorded:
- `api/public/hooks/ghl-nightly-sync` → `'cron'`
- `runGhlSyncNow` (admin button) → `'manual'`
- `syncCurrentUserToGhl` stays as-is (single-user, not a "run").

## Admin UI

New route `src/routes/_authenticated/admin.ghl-sync.tsx`:
- Guards on `has_role('admin')` like other admin pages.
- Server fn `listGhlSyncRuns` (admin-only) returns the last 20 runs.
- UI shows a table: trigger, started_at, duration, counts (processed/succeeded/failed/skipped). Row-click expands to show the per-contact error list (email + error text) when `errors` is non-empty.
- "Run now" button reuses existing `runGhlSyncNow`, then refetches the list.

Add a link on `/admin/users` header ("GHL sync history") pointing at the new route so admins can find it.

## Verification

1. Click **Run now** on `/admin/ghl-sync`.
2. New row appears at top; expanding it shows the 8× "401 The token is not authorized for this scope." entries with matching emails.
3. Fix the GHL token, click Run now again → new row shows `failed: 0`.

## Technical details

- Only two files gain non-trivial code: the cron helper (return-shape change + insert) and the new admin route. `runGhlSyncNow` gets a one-line `('manual')` arg.
- Errors JSON is truncated at 100 entries with a `truncated: true` flag when a nightly run has more failures — protects the row size.
- Migration includes GRANTs for `authenticated` (SELECT) and `service_role` (ALL), plus RLS policy scoped to admins.
