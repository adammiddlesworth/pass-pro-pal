# Weekly Mixed Challenge

A single 30-question exam shared by all users, rebuilt every Monday from the questions users are getting wrong the most across the entire platform (both categories combined). Paid users only. Unlimited retakes within the week.

## How it works

- Every Monday 00:00 UTC a job ranks every published question by its global wrong-rate over the last 30 days (from `user_answers`), applies a small floor so ultra-rare questions don't dominate, then locks in the top 30.
- That set is frozen for the week — every user sees the same 30 questions and the same order. Users can retake as many times as they like; each retake is a fresh attempt with fresh scoring.
- Access gate: any user with a completed purchase in `purchases` (either `real_estate_exam` or `life_health_exam`). Locked users see a teaser card with an upsell.

## User-facing surface

- **Dashboard** — new "Weekly Challenge" card in the top row, next to the readiness hero. Shows week number, "30 questions from what learners miss most", best score this week (if any), and a Start / Retake button. Locked variant shows the same card with a lock and "Unlock with any exam pack".
- **Exams browser** — a pinned banner above the topic grid mirroring the same card, so it's discoverable from `/exams` too.
- **Take flow** — reuse the existing exam-taking UI at a new route `/weekly` (no slug — always resolves to the current week's mix). Same question renderer, same submission flow. On completion, show score + a "your rank this week" line (percentile among users who've taken this week's mix).

## Data model

```text
weekly_mixes
  id            uuid pk
  week_start    date unique   -- Monday of the ISO week, UTC
  created_at    timestamptz

weekly_mix_questions
  mix_id        uuid fk -> weekly_mixes
  question_id   uuid fk -> questions
  order_index   int
  wrong_rate    numeric        -- snapshot at build time, for transparency
  primary key (mix_id, question_id)
```

Attempts reuse `user_attempts` with a new `attempt_type = 'weekly'` and a new nullable `weekly_mix_id` column so we can show best-of-week and leaderboards without joining through exam_id.

## Weekly generation

pg_cron job `generate-weekly-mix` runs `Mon 00:05 UTC`:

1. Compute per-question stats over the last 30 days: `wrong = count(is_correct=false)`, `total = count(*)`, require `total >= 20` (floor to avoid noise).
2. `wrong_rate = wrong::numeric / total`. Order by `wrong_rate desc, total desc`. Take top 30 across all published exams (both categories mixed).
3. Insert one `weekly_mixes` row for this Monday + 30 `weekly_mix_questions` rows. Idempotent on `week_start`.

If fewer than 30 questions clear the floor (early days), backfill with the highest wrong-rate questions ignoring the floor to always ship 30.

## Server functions (`src/lib/weekly.functions.ts`)

- `getCurrentWeeklyMix()` — public read; returns `{ mix, questions, weekStart, weekNumber }`. If no row for this week exists (cron hasn't fired yet on a brand-new install), fall back to the most recent mix.
- `getWeeklyMixStatus()` — auth'd; returns `{ hasAccess, bestScore, attemptsThisWeek, lastAttemptAt }`.
- `startWeeklyAttempt()` — auth'd; access-gated; creates a `user_attempts` row with `attempt_type='weekly'` and `weekly_mix_id`.
- `completeWeeklyAttempt()` — auth'd; scores + updates streak (same path as normal exams).

Grading and answer capture reuse the existing `saveUserAnswer` / `completeAttempt` fns — no changes needed there beyond the new attempt type.

## Files touched

- Migration: `weekly_mixes`, `weekly_mix_questions`, `user_attempts.weekly_mix_id`, extend allowed `attempt_type`, RLS + GRANTs, `generate_weekly_mix()` SQL function, pg_cron schedule.
- New `src/lib/weekly.functions.ts`.
- New route `src/routes/_authenticated/weekly.tsx` (start screen) and `src/routes/_authenticated/weekly.take.tsx` (question runner — thin wrapper around the existing take component).
- New component `WeeklyChallengeCard` used on `dashboard.tsx` and the exams browser.
- Small addition to `_authenticated/exams.index.tsx` to render the banner.

## Non-goals

- No per-user personalization for the weekly mix (that's what the Weak Spots review is for).
- No leaderboard page in v1 — just a personal best-of-week and percentile line on the results screen.
- No email/notification on Monday rotation.

## Open question flagged for later

Access gate is "any purchase unlocks it". Alternative would be "must own the category the question came from" — awkward for a mixed exam, so we're going with any-purchase. Say the word if you'd rather make it fully free as a top-of-funnel hook.
