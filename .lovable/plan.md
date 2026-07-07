## Why it's showing "Upgrade to unlock"
The dashboard passes `unlocked={!!trackInfo.locked}` to `WeaknessCard`, but `getActiveTrack` returns `locked: false` for admins (so they can switch tracks freely). You're an admin with purchases, so the card treats you as unpaid.

## Fix
Add a separate `hasFullAccess` flag to `ActiveTrackResult` — true when the user is an admin OR owns a purchase for the active track. `locked` keeps its current meaning ("can't switch tracks"); `hasFullAccess` controls paywalled UI like the Weakness card.

### Changes
- `src/lib/track.functions.ts`
  - Extend `ActiveTrackResult` with `hasFullAccess: boolean`.
  - Admin path: `hasFullAccess: true`.
  - Purchase path: `hasFullAccess: true` when `owned.includes(track)`.
  - Otherwise: `hasFullAccess: false`.
- `src/routes/_authenticated/dashboard.tsx`
  - Pass `unlocked={!!trackInfo.hasFullAccess}` to `<WeaknessCard />`.

That's it — no schema, no other UI changes. You'll see the unlocked Weakness card (either "complete a few exams" empty state or the pass-mark bar + "Retake weakness exam" button depending on completed attempts).

## Files
- edit: `src/lib/track.functions.ts`
- edit: `src/routes/_authenticated/dashboard.tsx` (one line)
