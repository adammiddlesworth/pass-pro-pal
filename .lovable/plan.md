## Update pricing and remove the bundle

### 1. Paddle catalog (test env — auto-syncs to live on publish)
- `PATCH` `real_estate_exam_price` → `unit_price.amount = "4999"` (USD).
- `PATCH` `life_health_exam_price` → `unit_price.amount = "4999"` (USD).
- Archive the `exam_bundle` product and its price in Paddle so it can't be purchased.

### 2. Frontend pricing page (`src/routes/pricing.tsx`)
- Delete the `exam_bundle` plan entry.
- Update both remaining plans' `price` string to `"$49.99"`.
- Drop the `"Best value"` highlight styling (or promote one track — default: leave both un-highlighted, symmetric two-column grid).
- Remove the `ownsProduct("exam_bundle")` branch.
- Layout goes from `md:grid-cols-3` → `md:grid-cols-2` with a narrower max width so the two cards look intentional, not sparse.

### 3. Checkout hook (`src/hooks/use-track-checkout.ts`)
- Remove `"exam_bundle"` from the accepted `productId` override type (it stays a valid string but no UI passes it anymore).

### 4. Checkout resume route (`src/routes/_authenticated/checkout.resume.tsx`)
- If it whitelists product IDs, drop `exam_bundle` from the list so a stale link can't reopen the bundle checkout.

### 5. Webhook (`src/routes/api/public/payments/webhook.ts`)
- The bundle-unlocks-both-tracks branch in `handleTransactionCompleted` can be removed. Not strictly required (no new bundle purchases will happen), but keeping it is harmless for any historical bundle purchase that later gets replayed. **Leave it in place** to preserve refund-revocation for any existing bundle buyer.

### Out of scope
- No DB migration — historical `purchases` rows for `exam_bundle` stay valid and keep granting both tracks via the existing webhook logic.
- No copy changes beyond the price number and the removed third card.

### Test plan (preview)
1. Visit `/pricing` signed-out → see two $49.99 cards, no bundle.
2. Click **Get started** on Real Estate → sign up → checkout resumes and Paddle overlay shows **$49.99**.
3. Pay with test card `4242 4242 4242 4242`, any future expiry, any CVC.
4. Land on `/checkout/success` → dashboard shows real estate content unlocked.
5. Repeat with a second account for Life & Health to confirm both prices updated in Paddle (the overlay amount is authoritative — if it still shows $19.99, the Paddle `PATCH` didn't land).
