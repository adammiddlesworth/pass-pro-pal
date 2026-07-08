## Problem

Every "Unlock" / "Upgrade to unlock" button across the app (dashboard, weekly challenge card, review page, weekly challenge page, diagnostic result) just navigates to `/exams`. Users then have to hunt for a specific exam and click *its* "Unlock Full Access" to reach the Paddle checkout. The user expects these CTAs to open checkout directly.

Only `exams/$slug/index.tsx` and `exams/$slug/take.tsx` currently open Paddle — via duplicated `handleBuy` logic.

## Plan

### 1. Extract a shared checkout helper

New `src/hooks/use-track-checkout.ts` exporting `useTrackCheckout()` returning `{ openCheckout, checkingOut }`.

- Takes `category` (track id), reads the current user from `useAuth`, resolves `CATEGORY_PRODUCT_IDS[category]` → `${productId}_price`, calls `initializePaddle` + `resolvePaddlePrice`, opens `Paddle.Checkout.open` with `customData: { userId, productId, priceId, ...attribution }` and `successUrl = /checkout/success` (with attribution query params).
- Mirrors current logic in `exams.$slug.index.tsx` / `exams.$slug.take.tsx` so behavior is identical.

### 2. Refactor existing checkout call sites

Replace the inline `handleBuy` / `handleUnlock` in `exams.$slug.index.tsx` and `exams.$slug.take.tsx` with the hook, so there is one source of truth.

### 3. Wire the hook into every upgrade CTA

Replace `<Link to="/exams">…Unlock/Upgrade</Link>` with a `<Button onClick={openCheckout}>` in:

- `src/routes/_authenticated/dashboard.tsx` — `PersonalizedReviewCard`'s "Upgrade to unlock" (already receives `category`).
- `src/components/WeeklyChallengeCard.tsx` — locked-state "Unlock" button. Accept `category` prop (dashboard passes `cat`; on `/exams` the card is shown without a category, so if none is provided fall back to the current `/exams` link).
- `src/routes/_authenticated/weekly.tsx` — the no-access "Browse exam packs" button becomes "Unlock Weekly Challenge". Needs a category — use the user's active track from `useActiveTrack`/`getActiveTrack` (already used elsewhere); if for some reason there's no track, keep the `/select-track` fallback.
- `src/routes/review.$category.tsx` — the `no_access` "Back to Exams" button becomes "Unlock Full Access" using the route's `category` param.
- `src/routes/diagnostic.$category.tsx` — the result-view "Unlock full prep" button uses the route's `category` param (currently just links to `/exams`).

Keep the "Browse exam packs" / "Back to exams" secondary links where they add value, but the primary CTA opens checkout.

### 4. Signed-out handling

Checkout requires an authenticated `userId` in `customData`. If the user is not signed in when a CTA is clicked (only possible on `/diagnostic/$category`, which is public), redirect to `/auth?mode=signup&redirect=<current-path>` instead of opening checkout. Elsewhere the CTAs live behind `_authenticated`.

### 5. Verification

- Type-check with `tsgo`.
- Manual click-through in preview: dashboard upgrade, weekly card unlock, weekly page unlock, review page unlock, diagnostic result unlock — each opens the Paddle overlay.

## Out of scope

- No pricing changes, no new Paddle products/prices.
- No changes to webhooks, subscription gating, or `/checkout/success`.
- No visual redesign of the CTAs beyond swapping link → button and updating labels.
