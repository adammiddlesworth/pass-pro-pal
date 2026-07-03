## Problem Statement

Users coming from your GHL marketing funnel will land on the Lovable app, sign up, and expect immediate access to their purchased exam. The current auth flow has several friction points that hurt conversion:

1. **No redirect-back after login** — If a user clicks "Sign In to Start" on an exam page, they are sent to `/auth`, and after login they always land on `/dashboard` instead of returning to the exam they were viewing.
2. **No password reset flow** — There is no "Forgot password?" link or `/reset-password` page.
3. **Email confirmation friction** — New sign-ups show "Check your email to confirm your account, then sign in." For buyers coming from a paid funnel, this is an extra step that can block access.
4. **Weak post-purchase onboarding** — The checkout success page is generic. A brand-new user sees "Go to Exams" with no guidance on selecting their track or starting their first exam.
5. **No email prefill from GHL** — If your GHL funnel passes the user's email via URL parameter, the app ignores it.

## Proposed Changes

### 1. Redirect-back after authentication
- Update `/auth` to read a `redirect` query parameter and navigate to it after successful sign-in.
- Update all "Sign In" CTAs throughout the app (exam detail page, etc.) to include `?redirect=` pointing back to the current page.
- After sign-up, if email confirmation is **disabled**, redirect to the return URL immediately. If confirmation is required, preserve the redirect intent in the confirmation email so the user lands back in the right place.

### 2. Forgot password flow
- Add a "Forgot password?" link on the `/auth` page that reveals an email input for password reset.
- Create a new public `/reset-password` route that:
  - Reads `type=recovery` from the URL hash (Supabase magic link format).
  - Shows a form to set a new password.
  - Calls `supabase.auth.updateUser({ password })` and then redirects to `/auth` (or the stored redirect URL).

### 3. Post-purchase onboarding on checkout success
- Update `/checkout/success` to detect if the user is new / has no track selected.
- If new: show a celebratory screen with a clear CTA — "Choose your exam track" → links to `/select-track`.
- If returning: show "Resume where you left off" and link to `/dashboard` or their most recent exam.

### 4. Accept pre-filled email from GHL links
- Update `/auth` to read `email` from query parameters and prefill the email input field.
- This lets your GHL "Get Started" button link to `/auth?email=john@example.com` so the user has one less field to type.

### 5. Auto-confirm email signups (decision needed)
- By default, Supabase requires email confirmation. For a paid funnel this adds friction.
- **Decision for you:** Should I disable email confirmation so users get instant access after sign-up? This is standard for most SaaS products with a checkout flow. If you keep confirmation enabled, I will at least make sure the redirect-back works through the confirmation email.
- **Trade-off:** Disabling confirmation is faster for users, but you lose the "verified email" guarantee. Since you also have Paddle checkout (which captures verified email via payment), the risk is low.

## Technical Details
- All changes are frontend/routing updates — no database migrations needed.
- The `/reset-password` route must be public (not under `/_authenticated`).
- No changes to Paddle checkout logic or subscription webhooks.

## Out of Scope
- Social login changes (Google already works).
- Changes to the Paddle checkout itself.
- Moving checkout to GHL (we are keeping it in the app per earlier recommendation).

## Open Decision
Please confirm:
- **Auto-confirm email signups** — disable email confirmation for instant access? (Recommended: yes)
- Any other GHL URL parameters you want passed through (e.g., `utm_source`, `ref`) beyond `email` and `redirect`?