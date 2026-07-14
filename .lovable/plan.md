## Goal

Every PassPal signup lands in GoHighLevel as a contact, and every active contact gets refreshed nightly with stats + segmentation tags so you can run win-back and urgency campaigns from GHL.

## Part 1 — Fix missing signups (Google OAuth path)

Today `syncSignupToGhl` only runs on the email/password signup branch in `src/routes/auth.tsx`. Google OAuth (the primary sign-in) never triggers it, so most leads never reach GHL.

- In `src/routes/__root.tsx`, extend the existing `supabase.auth.onAuthStateChange` handler: on `SIGNED_IN`, call a new `syncCurrentUserToGhl` server fn (below). Server-side, dedupe via a `profiles.ghl_synced_at` timestamp so we only push a "signup" once per user, then skip on subsequent logins (nightly cron handles ongoing updates).
- Add `ghl_synced_at timestamptz` to `profiles` (migration).
- Keep the existing email/password call for immediate sync on that path.

## Part 2 — Nightly stats + tag sync

Push last-login, streak, study time, accuracy, track, test date, and readiness band to every user active in the last 90 days.

### New server code

- `src/lib/ghl-cron.functions.ts` — internal `runNightlyGhlSync()` helper (not a public server fn). Uses `supabaseAdmin`.
- `src/routes/api/public/hooks/ghl-nightly-sync.ts` — public route triggered by `pg_cron`. Verifies `x-cron-secret` header against `CRON_SHARED_SECRET` (generated), then calls the helper. Processes users in batches of ~50 with small delays to stay under GHL's rate limits.

### Per-user payload pushed to GHL

Custom fields (add these keys in GHL first — I'll list them in the response):
- `passpal_last_login_at`
- `passpal_current_streak`
- `passpal_best_streak`
- `passpal_study_hours`
- `passpal_accuracy_pct` (30-day)
- `passpal_readiness_score`
- `passpal_track`
- `passpal_test_date`
- `passpal_days_to_test`
- `passpal_last_activity_at`

Tags (computed each run, added; stale ones removed via a small "known tag set" convention — prefix `passpal-` so we only churn our own tags):
- Activity: `passpal-active-7d`, `passpal-active-30d`, `passpal-inactive-30d`, `passpal-inactive-60d`
- Streak: `passpal-streak-3`, `-7`, `-14`, `-30` (highest milestone reached currently)
- Readiness: `passpal-readiness-low` (<50), `passpal-readiness-mid` (50–79), `passpal-readiness-ready` (80+)
- Test date: `passpal-test-date-set`, `passpal-test-within-30d`, `passpal-test-within-7d`

### GHL client additions (`src/lib/ghl.server.ts`)

- `removeContactTags(contactId, tags)` — DELETE `/contacts/{id}/tags`.
- `findContactByEmail(email)` — used to get contactId + current tags for tag diffing.
- Extend `upsertContact` to also return current tags so we can compute add/remove sets in one pass.

### Cron schedule (via `supabase--insert`)

`0 7 * * *` UTC daily → POST to `https://project--c2b8af3c-4bd1-4519-b110-4d1bdbc4e4e2.lovable.app/api/public/hooks/ghl-nightly-sync` with `x-cron-secret` header. Uses `pg_cron` + `pg_net`.

## Part 3 — Admin trigger + observability

- Add "Run GHL sync now" button on `/admin/users` (admin-only server fn) so you can manually kick a sync when testing without waiting for cron.
- Log per-run summary: `{ processed, succeeded, failed, skipped }` to console (visible in server logs).

## Secrets

- `CRON_SHARED_SECRET` — generated via `generate_secret`.
- Existing `GHL_PIT` / `GHL_LOCATION_ID` reused.

## Verification steps

1. Sign up with a fresh Google account → contact appears in GHL within seconds with `passpal-signup` tag.
2. Trigger sync manually from admin → verify custom fields + tags on a known user in GHL.
3. Check `cron.job_run_details` after first scheduled run.

## What you'll need to do in GHL (one-time)

Create the custom fields listed above (Contact → Custom Fields). I'll include exact key names in the completion message so copy-paste is direct.
