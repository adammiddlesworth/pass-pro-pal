# Fix GoHighLevel sync failures (rate limiting)

## What's actually failing

Yes, the sync is partly failing — but not because of tokens, scopes, or data. The last four nightly runs each processed 58 users and failed 5-8 of them, and **every single failure is the same error**:

```text
429: {"statusCode":429,"message":"Too Many Requests"}
```

GoHighLevel is rejecting requests because we send them too fast. Currently 8 users sit in a `failed` state; 54 are `synced`. The failing accounts are roughly the same ones each night (they land in the tail batches), including isaiah63_3@yahoo.com, erickd4046@gmail.com, kyrill913@gmail.com, zrmcle98@gmail.com, primative13@gmail.com, nielsen.evan23@gmail.com, wecsuccess@yahoo.com, edithhernandez1107@gmail.com.

Note the run on Aug 27 succeeded 55/55 — so this started as the user count grew past GHL's burst allowance. It will get worse as PassPal grows.

## Why it happens

The nightly job syncs users in batches of 25 **in parallel**, with only a 250ms pause between batches. Each user costs up to 3 GHL API calls (upsert, read contact, remove stale tags). So a single batch can fire ~75 requests almost instantly, which trips GHL's per-location rate limit.

## The fix

1. **Lower burst size** — process users with a small concurrency limit (5 at a time) instead of 25-wide parallel batches, with a short pause between each, so request rate stays well under GHL's limit.
2. **Retry on 429** — in the GHL client, when a call returns 429, wait (honouring the `Retry-After` header when present, otherwise exponential backoff: ~1s, 2s, 4s) and retry up to 3 times. This alone would have made all 8 failures succeed.
3. **Skip needless calls** — only run the tag-reconcile read/delete when the desired tag set could have changed, cutting API volume roughly in half.
4. **Re-run the sync** after the change so the 8 currently-failed contacts get pushed and their status clears to `synced`.

## Technical detail

- `src/lib/ghl.server.ts`: add a shared `ghlFetch` wrapper with 429-aware retry/backoff used by `upsertContact`, `getContact`, `addContactTags`, `removeContactTags`.
- `src/lib/ghl-cron.server.ts`: replace the `BATCH = 25` / `Promise.all` loop with a bounded-concurrency worker pool (5), keeping the existing per-user error tallying and `ghl_sync_runs` logging intact.
- Verification: run the admin "Run now" sync from `/admin/ghl-sync` and confirm `failed = 0` in the newest run row, and that no profile is left with `ghl_sync_status = 'failed'`.
