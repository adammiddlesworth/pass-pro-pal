
## Diagnostic Exam — Plan

A short, free per-category "diagnostic" that samples questions across every topic, then shows a readiness score, weakest topics, and a prominent upgrade CTA. Signed-in users only (any account, no purchase required).

### Behavior

- Two diagnostics: one for Real Estate, one for Insurance.
- ~2 questions per topic (skipping the "mixed" / "final exam" pseudo-topics), capped at ~20 questions total. If a category has fewer topics, we just take a few extra from the largest ones so length stays consistent.
- Question selection is randomized per attempt but seeded by `(user_id, category, week_start)` so a user re-taking within a week sees the same set (avoids gaming the score by refreshing). New week → new sample.
- Unlimited retakes.
- Result screen shows: overall %, readiness score (0–100) using the existing `calculateReadiness` helper, top 3 weakest topics, and a big "Unlock full prep" button linking to checkout for that category.
- Diagnostic attempts are stored in `user_attempts` with `attempt_type = 'diagnostic'` and `exam_id = null` (like the weekly mix), so they don't pollute per-exam stats or the dashboard readiness calc.

### Access

- Requires signed-in user (lives under `_authenticated/`).
- Entry points:
  - Track-select page: "Not sure where you stand? Take the 5-min diagnostic" link on each track card.
  - Dashboard: small card above `UpNextCard` for users who haven't yet taken this week's diagnostic in their category.
  - Exams browser: subtle banner at the top.
- After completion, the result screen is the primary conversion surface.

### Data & backend

No new tables. We reuse:
- `questions` + `exam_tags` for topic-tagged sampling.
- `user_attempts` (new `attempt_type` value `'diagnostic'`, `exam_id` nullable — already is) + `user_answers`.

New server functions in `src/lib/diagnostic.functions.ts` (all `requireSupabaseAuth`):
- `startDiagnostic({ category })` — deterministic per-week sample, creates a `user_attempts` row, returns `{ attempt_id, questions: [...] }`.
- `saveDiagnosticAnswer({ attempt_id, question_id, selected_answer_id })`.
- `completeDiagnostic({ attempt_id })` — scores, computes readiness via existing `calculateReadiness`, returns overall %, per-topic breakdown, weakest topics, readiness result, and `has_access` flag for the CTA copy.
- `getDiagnosticStatus({ category })` — returns whether the user has an in-progress or completed diagnostic this week.

No admin work required — sampling is automatic. (You mentioned "I can build this in admin if needed" — with auto-sampling it isn't needed. If you'd rather curate later, we can add an `is_diagnostic` flag on exams as a follow-up.)

### UI

- New route `src/routes/_authenticated/diagnostic.$category.tsx` — take flow + result screen (single route with local state, same pattern as `/weekly`).
- New component `DiagnosticCard.tsx` — dashboard entry point.
- Small banner on `exams.index.tsx` and link on `select-track.tsx`.
- Result screen: readiness gauge (reuse styling from dashboard readiness), weakest-topics list, "Unlock full prep" primary CTA → `checkout` for the category, secondary "Try the free sample exam" link → the existing `is_sample` exam for that category.

### Files

- Create: `src/lib/diagnostic.functions.ts`, `src/routes/_authenticated/diagnostic.$category.tsx`, `src/components/DiagnosticCard.tsx`.
- Edit: `src/routes/_authenticated/dashboard.tsx`, `src/routes/_authenticated/select-track.tsx`, `src/routes/_authenticated/exams.index.tsx`.
- No migrations. No admin changes.
