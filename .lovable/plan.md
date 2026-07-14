## Goal

Tighten the Readiness score so users must (a) practice broadly and (b) pass a real timed final exam before Readiness reads "Ready".

## 1. New "Timed Final Exam" exam category

- Add `exam_category` enum value handling by adding a new column instead of touching the enum: `exams.is_timed_final boolean not null default false` plus `exams.time_limit_minutes int` (nullable).
- The user asked for a new category — implemented as an exam-level flag so an exam still belongs to its licensing category (real_estate / life_health_insurance) but is separately flagged as the timed final. This keeps existing category filters, purchases, and topic rollups intact.
- Defaults: when `is_timed_final = true` and `time_limit_minutes` is null:
  - real_estate → 150 min (2.5 h)
  - life_health_insurance → 180 min (3 h)
- Pass mark stays 70% (matches existing `PASS_MARK`).

## 2. Admin UI (`admin.exams.tsx`)

- Add a "Timed Final Exam" checkbox next to the existing "Sample" checkbox in the exam editor.
- When checked, show a "Time limit (minutes)" input pre-filled with the category default.
- Show a "Timed Final" badge in the exam list.
- `saveExam` server fn accepts + persists `is_timed_final` and `time_limit_minutes`.

## 3. Timed take flow (`exams.$slug.take.tsx`)

- If the loaded exam has `is_timed_final`:
  - Show a "Start Timed Exam" gate before questions render (one confirmation click starts the clock).
  - Persist `started_at` on the attempt (already exists) and compute `deadline = started_at + time_limit_minutes`.
  - Render a countdown in the header; when it hits 0, auto-submit via `finalizeAttempt`.
  - Disable "Start over" mid-attempt so the clock can't be reset by reloading — resume uses the original `started_at`.
- Non-final exams: unchanged.

## 4. Readiness scoring changes (`src/lib/readiness.ts` + `dashboard.functions.ts`)

Tighten coverage and add a hard final-exam gate.

### Weights (was → now)
- Recent performance:  40% → 30%
- Coverage:            20% → 35%
- Weak-spot penalty:   25% → 20%
- Consistency:         15% → 15%

### Coverage rule
- Coverage now scales against a required 80% of topics practiced (≥5 answers each):
  `coverage = min(100, practiced / (0.8 * totalTopics) * 100)`
- Below 80% coverage, cap final Readiness at **75** regardless of other inputs.

### Timed final gate
- Extend `ReadinessInput` with `passedTimedFinal: boolean`.
- If `passedTimedFinal === false`, cap Readiness at **79** and force status to "Almost there".
- Reason text updates:
  - No practiced final: "Take the timed final exam to prove you're ready."
  - Attempted but failed: "You haven't passed the timed final yet — retake it to reach Ready."

### `getReadiness` server fn
- Query `user_attempts` joined on `exams` for the category where `exams.is_timed_final = true`, `completed_at is not null`, `score/total*100 >= 70` → sets `passedTimedFinal`.
- Return new fields: `passedTimedFinal`, `hasTimedFinal` (does a timed final exam exist for this category yet), so the dashboard can show a "Take the timed final" CTA.

## 5. Dashboard surface (`_authenticated/dashboard.tsx`)

- In the Readiness card, when `hasTimedFinal && !passedTimedFinal`, show a prominent "Take the Timed Final Exam" button linking to that exam's take page.
- When `!hasTimedFinal`, show a small muted note: "Timed final exam coming soon for this track" (so scoring stays consistent even before admin adds one).

## 6. Migration

Single migration:
- `alter table public.exams add column is_timed_final boolean not null default false;`
- `alter table public.exams add column time_limit_minutes int;`
- No RLS/policy changes needed (existing exam policies already cover new columns).

## Out of scope

- Regenerating existing exams as "final". Admins mark one per track manually.
- Per-question timing, pausing, or proctoring.
- Retake cooldowns.

## Technical notes

- Types regenerate after the migration; UI + server-fn edits land after.
- Countdown uses a `setInterval` in the take component, plus a server-side deadline check inside `finalizeAttempt` so a client with a hacked clock still can't submit past the deadline (server recomputes elapsed from `started_at`).
