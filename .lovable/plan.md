## One-time diagnostic + persistent report

Right now the diagnostic reseeds every Monday and encourages weekly retakes. Change it to a single lifetime attempt per user per track, then always show the same report (with the upgrade CTA) when they return.

### `src/lib/diagnostic.functions.ts`

- Drop the weekly seed. Seed becomes `${userId}:${category}` so the question set is stable per user.
- `getDiagnosticStatus`: remove the week filter. Rename the return shape to `{ hasTaken, lastCompletedAt, lastScorePct }` (query the user's most recent completed `diagnostic` attempt, no `gte(weekStart)`).
- `startDiagnostic`: if the user already has a completed diagnostic attempt for this category, throw an error (`"Diagnostic already completed"`). The UI will route them to the report instead of calling this.
- New `getDiagnosticReport({ category })` server fn (`requireSupabaseAuth`):
  - Load the user's latest completed diagnostic `user_attempt` for the category (join by looking at attempts of `attempt_type = 'diagnostic'`; we'll add a `category` column — see below — so we can filter cleanly).
  - Load its `user_answers` joined to `questions → exam_id → exams.exam_tags` so we can recover each question's topic slug/label via `getTopicsForCategory`.
  - Re-aggregate correct/total, per-topic scores, weakest/strongest, and re-run `calculateReadiness` to return the same `DiagnosticResult` shape used today.
- `completeDiagnostic`: unchanged scoring; also write `category` on the attempt (see migration).

### Migration

- Add `category text` (nullable) to `public.user_attempts` so diagnostic attempts can be filtered per track without joining exams (diagnostic rows have `exam_id = null`).
- Backfill existing diagnostic rows: leave `category` NULL — they were the old weekly-sample flow; treated as "no report available, take a fresh one." (Only affects test data.)

### `src/routes/diagnostic.$category.tsx`

- On mount (authed), call `getDiagnosticStatus`. Branch:
  - `hasTaken === true` → fetch `getDiagnosticReport` and render `ResultView` directly.
  - Otherwise → render `IntroView` → `QuizView` → `ResultView` as today.
- `IntroView`: remove the "Retake with a new sample each week" bullet. Replace with "One-time diagnostic — you'll get a personalized report at the end."
- `ResultView`:
  - Remove the "Retake diagnostic" buttons (both the has-access and no-access branches).
  - Keep the upgrade CTA as the primary action for users without access.
  - For users with access, keep "Browse exams" as the primary action.
  - Add a small footer note: "This is your diagnostic report — saved for your account."

### `src/components/DiagnosticCard.tsx`

- Update copy: remove "New sample every Monday. Retake to see if you're improving." When taken, show "You scored X% — view your full report." Button label becomes "View report" (links to `/diagnostic/{category}`).
- Intro copy stays "A 20-question sample across every topic. Get your readiness score."

### Out of scope

- No changes to weekly challenge, exams list, or checkout flow.
- No new schema beyond the `category` column on `user_attempts`.

### Files touched

- `src/lib/diagnostic.functions.ts` (edit)
- `src/routes/diagnostic.$category.tsx` (edit)
- `src/components/DiagnosticCard.tsx` (edit)
- New migration: `alter table public.user_attempts add column category text`
