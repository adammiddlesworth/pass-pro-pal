## Problem

Google sign-in fails with a 400 error. The auth logs show `"missing OAuth secret"` — the Google provider isn't fully configured in Lovable Cloud, so the `/authorize` request is rejected before it ever reaches Google.

## Fix

Run the social auth configuration for Google, which registers Lovable Cloud's managed Google OAuth credentials with the project. This does not require you to create a Google Cloud project or paste any keys — the managed credentials are used by default.

## Steps

1. Configure the Google provider on the backend (managed credentials, no keys needed from you).
2. Verify the sign-in button still uses `lovable.auth.signInWithOAuth("google", ...)` with `redirect_uri: window.location.origin` (already correct in `src/routes/auth.tsx`).
3. Ask you to retry Google sign-in in the preview.

## Notes

- No code changes to auth UI expected — this is a backend provider configuration.
- If you later want your own branded Google OAuth (your own client ID/secret), that can be swapped in via Cloud auth settings without code changes.
- The hydration warning in the runtime error list is unrelated to the 400 and can be addressed separately if you want.
