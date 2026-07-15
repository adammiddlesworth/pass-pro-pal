## Diagnosis

The sync ran cleanly on our side — the code, cron, and admin trigger all work. Every call to GHL is being rejected with:

```
401 "The token is not authorized for this scope."
```

This is a GHL-side permissions issue on your **Private Integration Token (PIT)**. The token was created without the scopes needed to read/write contacts and tags.

## Fix (all in GoHighLevel — no code change needed)

1. In GHL, go to **Settings → Private Integrations** (in the sub-account whose ID is stored as `GHL_LOCATION_ID`).
2. Either edit the existing PIT or create a new one, and enable at minimum these scopes:
   - `contacts.readonly`
   - `contacts.write`
   - (recommended, for tag reconcile) `contacts/tags.write` if listed separately in your GHL edition
3. Copy the new token value.
4. Back in Lovable, update the `GHL_PIT` secret with the new token (I'll open the secure form for you).
5. Click **Run GHL sync now** on `/admin/users` and confirm the summary shows `succeeded: 8, failed: 0`.

## Also verify (common gotcha)

Confirm `GHL_LOCATION_ID` is the **sub-account (Location) ID** — not the Agency ID. A PIT is scoped to one Location; if the ID belongs to a different Location than the token, GHL also returns 401 on this endpoint.

## What I won't change

No code edits — the integration works. Only the token/scopes in GHL need adjustment.
