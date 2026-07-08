## Goal

Push every meaningful lead event from PassPal into a GoHighLevel sub-account as a Contact, with tags and custom fields so you can build workflows (nurture emails, SMS, AI Studio agents) inside GHL. The PassPal app keeps owning auth, checkout, and exam data — GHL becomes the CRM/marketing layer.

## What syncs to GHL

| Event | GHL action | Tags applied |
|---|---|---|
| New signup (profile row created) | Upsert contact by email | `passpal-signup`, `track-<category>` (once track chosen) |
| Diagnostic completed | Update contact + custom fields (score, readiness, weak topics) | `diagnostic-completed`, `readiness-<green\|amber\|red>` |
| Track selected | Update contact | `track-<real_estate\|life_health_insurance>` |
| Purchase (Paddle webhook) | Update contact | `customer`, `purchased-<category>` |

Contacts are matched/upserted by email (GHL's native dedupe).

## Setup (one-time, done by user in GHL)

1. In the target sub-account: **Settings → Private Integrations → Create** — grant scopes `contacts.write`, `contacts.readonly`. Copy the Private Integration Token (PIT).
2. Copy the **Location ID** from Settings → Business Profile.
3. Save both in Lovable Cloud secrets: `GHL_PIT` and `GHL_LOCATION_ID` (I'll request these via the secure secret form when we build).

## Implementation

### 1. Server-only GHL client
`src/lib/ghl.server.ts` — thin wrapper around `https://services.leadconnectorhq.com`:
- `upsertContact({ email, firstName, lastName, tags, customFields })` → `POST /contacts/upsert` with headers `Authorization: Bearer ${GHL_PIT}`, `Version: 2021-07-28`, `Accept: application/json`.
- `addTags(contactId, tags[])` → `POST /contacts/{id}/tags`.
- Fails soft: logs status + body, returns `{ ok: false, error }`. Never throws into the user's request path — CRM sync should never break signup or checkout.

### 2. Event hooks (all server-side, no client changes)
- **Signup**: extend `handle_new_user` trigger path — add a new `createServerFn` `syncSignupToGhl` called from `src/routes/auth.tsx` after successful `signUp` (fire-and-forget, awaited only for logging).
- **Diagnostic complete**: in `src/lib/diagnostic.functions.ts` `completeDiagnostic.handler`, after saving the attempt, call `upsertContact` with score/readiness custom fields.
- **Track selected**: in `src/lib/track.functions.ts` (or wherever `select-track` writes the profile), add tag.
- **Purchase**: in `src/routes/api/public/payments/webhook.ts`, after the existing verified Paddle webhook processes a successful purchase, call `upsertContact` with `customer` + `purchased-<category>` tags. This is the most reliable trigger — Paddle is already verified.

Each call site wraps the GHL call in try/catch and logs failures — the primary business logic (creating the attempt, recording the purchase) always commits first.

### 3. Custom fields in GHL
User creates these once in GHL (**Settings → Custom Fields → Contact**), all type "Text" or "Number":
- `passpal_track`, `passpal_readiness_score`, `passpal_diagnostic_status`, `passpal_weak_topics`, `passpal_last_activity_at`.

The client looks them up by key name on first use and caches the id→key map in memory per Worker instance.

### 4. Backfill script (optional)
`scripts/ghl-backfill.ts` — one-off Node script that reads existing `profiles` + `purchases` from the DB and upserts them into GHL in batches of 50 (GHL's rate limit is 100 req / 10s per location). Run manually with `bun run scripts/ghl-backfill.ts`.

## Out of scope

- No changes to the app UI, auth flow, checkout, or exam logic.
- No two-way sync (GHL → PassPal). If you later want GHL workflows to update PassPal (e.g. mark a user as unsubscribed), that's a follow-up using a GHL webhook → `/api/public/ghl/webhook`.
- No replacement of the transactional email path — GHL can send its own nurture emails via workflows against these tags.

## Verification

- Manual: sign up a test account → confirm contact appears in GHL with `passpal-signup` tag within ~2s. Complete a diagnostic → confirm custom fields populated. Test Paddle purchase in sandbox → confirm `customer` tag.
- Logs: `server-function-logs` filter on `ghl` for any non-2xx from LeadConnector.

## Before I build — I need from you

1. Confirm **which GHL sub-account (location)** this connects to.
2. Confirm you can create a **Private Integration Token** there (Agency Pro plan or sub-account with PIT enabled). If not, we'll use OAuth instead (more setup — a Marketplace app).
3. Any additional events you want synced beyond the four above (e.g. "started diagnostic but didn't finish" for abandonment nurture)?
