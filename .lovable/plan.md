# Track Total Study Time

Count elapsed time from every `user_attempts` row (exams, reviews, weekly mix) as study time, then expose lifetime and this-week totals in three places.

## Data model

No schema changes. Use existing `user_attempts.started_at` and `completed_at`:

- **Completed** attempt → `duration = completed_at - started_at`
- **In-progress** attempt → ignored (avoid runaway timers from abandoned tabs)
- **Clamp per attempt** to a sane maximum so a user who left a tab open overnight before finishing doesn't inflate totals:
  - Timed final: cap at `time_limit_minutes`
  - Non-timed exam: cap at `question_count * 2 minutes` (min 15m, max 3h)
  - Review / weekly mix (no exam_id): cap at 90 minutes
- **Minimum** per attempt: 0 (a same-second finish counts as 0, not negative)

This is computed on read — no new columns, no backfill.

## Server

Add to `src/lib/dashboard.functions.ts`:

- Extend `DashboardStats` with `study_seconds_total` and `study_seconds_week`.
- In `getDashboardStats`, also fetch review/weekly attempts (drop the `exams!inner(category)` filter for the time calc, since reviews have no exam) filtered by user + category (reviews attributed to the currently-viewed category when `attempt_type = 'review'`; weekly mix always counted).
- Apply the clamp above and sum.

Add `src/lib/admin-users.functions.ts` field `study_seconds_total` to the user-detail server fn (admin only, already gated).

## UI

1. **Dashboard stats card** (`src/routes/_authenticated/dashboard.tsx`) — add a fourth tile "Time studied" showing lifetime `Xh Ym`, subtitle "Xh Ym this week".
2. **Admin user detail** (`src/routes/_authenticated/admin.users.$userId.tsx`) — add "Total study time" row in the stats block.
3. **Settings** (`src/routes/_authenticated/settings.tsx`) — small "Study time" section: lifetime total + this-week total.

Shared formatter in `src/lib/utils.ts`: `formatStudyDuration(seconds)` → `"12h 34m"` / `"45m"` / `"< 1m"`.

## Technical notes

- Purely derived; no migration, no writes, no cron.
- Query keys extended with the new fields; existing `useSuspenseQuery` calls just get more data.
- Weekly window uses the same Sun-anchored week as `getStreak` for consistency.

## Out of scope

- Active-tab heartbeat tracking
- Per-topic or per-day time breakdown charts
- Historical backfill beyond what `user_attempts` already contains
