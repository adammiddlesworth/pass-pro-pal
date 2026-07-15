## Plan: proceed as-is

The GoHighLevel integration is already implemented and the nightly cron is scheduled. No code changes are needed — this plan just confirms the rollout.

### What's already live
- `profiles.ghl_synced_at` column tracks first-time signup sync (deduped).
- `syncCurrentUserToGhl` fires on every `SIGNED_IN` event from `src/routes/__root.tsx` (covers Google OAuth + email/password).
- `syncSignupToGhl` still runs on email/password signup for immediate push.
- Nightly cron `ghl-nightly-sync` at `0 7 * * *` UTC hits `/api/public/hooks/ghl-nightly-sync`, which runs `runNightlyGhlSync()` over all users active in the last 90 days.
- Per-user payload: custom fields (`passpal_last_login_at`, `passpal_last_activity_at`, `passpal_current_streak`, `passpal_best_streak`, `passpal_study_hours`, `passpal_accuracy_pct`, `passpal_readiness_score`, `passpal_track`, `passpal_test_date`, `passpal_days_to_test`) plus reconciled `passpal-*` tags for activity recency, streak milestones, readiness band, and test-date windows.
- Admin → Users has a **Run GHL sync now** button for on-demand testing.

### One-time setup you need to do in GoHighLevel
1. **Settings → Custom Fields → Contact** — create the 10 `passpal_*` fields listed above using those exact field keys (types: dates for `*_at` / `test_date`, numbers for streaks / hours / accuracy / readiness / days_to_test, text for `track`).
2. Tags require no setup — they're created automatically on first sync.

### Verification after you create the fields
1. Sign in with a fresh Google account → contact appears in GHL within seconds with the `passpal-signup` tag.
2. Click **Run GHL sync now** in `/admin/users` → confirm custom fields and tags populate on a known user.
3. After the first 07:00 UTC run, check the server logs for the `{ processed, succeeded, failed, skipped }` summary.

### Nothing to change in code
If the fields exist in GHL and the button test passes, we're done — the cron takes over nightly.
