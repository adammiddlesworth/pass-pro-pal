## Goal

Redesign the dashboard to match the mockup: one big **Exam-Day Readiness** hero at the top, the blue **Up next** banner below, then a two-column row with **Daily streak** and a **Personalized review** card (the renamed Weakness card) showing individual weak topics. Keep the existing "Recent exams" list at the bottom.

## Layout

```text
┌──────────────────────────────────────────────────────────────┐
│  ⬤ 74   EXAM-DAY READINESS                                    │
│  /100   [Almost there]                                       │
│         Focus on your weak spots. Weakest area: Finance…     │
│         ─────────────────────────────────────────────────    │
│         74%          4/10             12 days                │
│         Recent avg   Topics covered   Until test             │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  →  UP NEXT                                        ▷ Start   │
│     Real Estate Principles — Practice Exam 4                 │
│     45 questions · ~35 min                                   │
└──────────────────────────────────────────────────────────────┘

┌───────────────────────────┐  ┌──────────────────────────────┐
│ 🔥 Daily streak           │  │ ✦ Personalized review        │
│ 9   ✓ ✓ ✓ ✓ ✓ ✓ T         │  │  ◎ Your review session       │
│ days in a row             │  │    Built from your weak spots│
│ Best streak: 14 days…     │  │  Loan-to-value ratios   42%  │
│                           │  │  Amortization schedules 51%  │
│                           │  │  Escrow & closing costs 63%  │
│                           │  │  [ ▷ Start review session ]  │
└───────────────────────────┘  └──────────────────────────────┘

Recent exams (unchanged)
```

## Changes

### 1. Test-date field on profile
- Migration: add `test_date date` to `public.profiles` (nullable). RLS already allows the user to update their own row.
- Add a **Settings → Exam date** entry point. Simplest: an inline "Set exam date" button on the readiness card when `test_date is null`; when set, show "12 days Until test" and let the user click it to change (shadcn Popover + Calendar with `pointer-events-auto`). No separate settings page needed for this pass.
- New server fn `updateTestDate({ date | null })` under `src/lib/profile.functions.ts` (uses `requireSupabaseAuth`).

### 2. Readiness data — add weakest-topics list + test date to the response
- Extend `getReadiness` to return the underlying topic list and the profile's `test_date`:
  - `topics: { slug, name, score }[]` (sorted ascending by score, capped at ~3 for the Personalized review card).
  - `topicsPracticed: number`, `topicsTotal: number` (drives "4/10 Topics covered").
  - `testDate: string | null` (ISO date) — days-until computed client-side.
- `ReadinessResult` type updated accordingly; existing `breakdown` and `readiness` numbers unchanged.

### 3. New `ReadinessHero` component (replaces `ReadinessCard` + `StatsRow`)
- Single full-width `Card` with a two-column body: ring on the left (larger — 128px), content stack on the right.
- Right column: status pill → reason text → thin divider → three-column mini-stat row (`Recent avg %`, `Topics covered X/Y`, `Until test N days` or "Set exam date" button when unset).
- Colour rules unchanged (green ≥85, amber ≥70, else rose) driven by `data.color`.
- Removes the old 2×2 breakdown grid; the four sub-scores stay in the tooltip via `title` on the ring (progressive disclosure) so we don't lose the info.

### 4. Rename `WeaknessCard` → `PersonalizedReviewCard`
- Header: sparkle icon (`Sparkles` from lucide) + "Personalized review".
- Body when unlocked and topics exist: a "Your review session" sub-header with `Target` icon and "Built from your weak spots" caption, then a list of the weakest topics from `readiness.topics` (up to 3) with each score coloured by the same 80/65 thresholds already used for the Recent list. Bottom button: "Start review session" → `/review/$category` (existing route).
- Empty / locked states keep their current copy but restyled to match.
- Old avg-vs-pass progress bar is removed — the ring in the hero already communicates overall standing.

### 5. Grid changes in `dashboard.tsx`
- Delete `StatsRow` and the three-tile row.
- Render `<ReadinessHero />` full-width above `<UpNextCard />`.
- The `Daily streak` + `Personalized review` two-column row stays where it is.
- `Recent exams` card stays at the bottom, unchanged.

## Files touched

- `supabase/migrations/…` — add `test_date` column to `profiles`.
- `src/lib/readiness.ts` — extend `ReadinessResult` type.
- `src/lib/dashboard.functions.ts` — extend `getReadiness` return; keep pass mark / topic logic.
- `src/lib/profile.functions.ts` *(new)* — `getMyProfile`, `updateTestDate`.
- `src/routes/_authenticated/dashboard.tsx` — new `ReadinessHero`, rename `WeaknessCard` to `PersonalizedReviewCard`, remove `StatsRow`, wire everything up.

## Non-goals

- No changes to `/review/$category`, exam flows, or purchases logic.
- No new settings page — exam date is edited inline from the hero for now.
- No visual redesign of the Up next banner, Daily streak card, or Recent exams list.
