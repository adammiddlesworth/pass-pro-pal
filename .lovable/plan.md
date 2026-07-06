## Goal
Make users coming from your GHL funnel feel like the app already knows them. Give them a branded entry point, prefill their email, preserve UTM/attribution data through sign-up and checkout, and store that attribution on the purchase record so you can report on GHL ROI.

## What we will build

### 1. Dedicated `/start` page for GHL traffic
- New public route at `/start`.
- Reads `email`, `utm_source`, `utm_medium`, `utm_campaign`, `ref` from the URL.
- Shows a simple welcome card with a clear "Get started" CTA.
- CTA links to `/auth` with all params preserved.
- Recommended GHL button link: `https://yourapp.lovable.app/start?email=john@example.com&utm_source=ghl&utm_campaign=...`

### 2. Update `/auth` to preserve GHL context
- Accept `utm_source`, `utm_medium`, `utm_campaign`, `ref` in the search schema alongside `email` and `redirect`.
- Show a contextual message when `utm_source=ghl` (e.g., "Welcome! Let's set up your PassPal account.").
- Store attribution params in `sessionStorage` so the checkout flow can read them after sign-up.
- Continue to honor `email` prefill and `redirect` after sign-in/sign-up.

### 3. Carry attribution through Paddle checkout
- Update the buy button on `/exams/$slug/` to read attribution from `sessionStorage` (or URL fallback) and pass it in Paddle `customData`.
- Append UTM params to the Paddle `successUrl` so the success page can read them.
- Keep existing `customData` fields: `userId`, `productId`, `priceId`.

### 4. Store attribution in the database
- Migration: add `utm_source`, `utm_medium`, `utm_campaign`, `ref` text columns to the `purchases` table.
- Update `/api/public/payments/webhook.ts` to read attribution from `customData` and write it with the purchase rows.
- This lets you query which completed purchases came from GHL or a specific campaign.

### 5. Update `/checkout/success`
- Read UTM params from the URL.
- If the user is not logged in, redirect to `/auth?email=...&redirect=/checkout/success` with UTM params preserved.
- Show GHL-specific welcome copy when `utm_source=ghl`.
- Keep existing new vs returning user CTAs (choose track / go to dashboard).

### 6. Update `/` root redirect
- If the user is signed in, redirect to `/dashboard` as today.
- If logged out and the URL includes GHL-related params, redirect to `/start` instead of bouncing cold to `/auth`.

## Technical details
- One small migration: add four text columns to `public.purchases`.
- No changes to Paddle products, prices, or the auth provider.
- No new backend service — uses existing TanStack server functions, Paddle checkout, and webhook.
- All URL params are validated with Zod and sanitized for safe redirects (same-origin paths only).

## Out of scope
- Syncing contacts or sending data back to GHL via API.
- Full marketing landing pages beyond the focused `/start` entry point.
- Email nurture sequences.

## Files that will change
- New: `src/routes/start.tsx`
- Edit: `src/routes/auth.tsx`
- Edit: `src/routes/exams.$slug.index.tsx`
- Edit: `src/routes/checkout.success.tsx`
- Edit: `src/routes/index.tsx`
- Edit: `src/routes/api/public/payments/webhook.ts`
- Migration: add attribution columns to `purchases`