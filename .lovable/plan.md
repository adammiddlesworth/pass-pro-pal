## Auto-save & Resume Exams

Persist each answer as users tap it, and let them resume an incomplete attempt where they left off.

### Data model
Reuse existing tables — no schema changes required:
- `user_attempts` already has `started_at`, `completed_at`, `score`. Treat rows with `completed_at IS NULL` as "in progress".
- `user_answers` (attempt_id, question_id, answer_id, is_correct) stores per-question responses.

Add one migration:
- Unique index on `user_answers (attempt_id, question_id)` so upserts replace prior selections cleanly.
- Optional: index on `user_attempts (user_id, exam_id) WHERE completed_at IS NULL` for fast "resume" lookup.

### Server functions (`src/lib/attempts.functions.ts`)
All `requireSupabaseAuth`, all verify the attempt belongs to `userId`:
- `startOrResumeAttempt({ examId })` — returns an in-progress attempt if one exists, else inserts a new one. Returns `{ attemptId, answers: [{question_id, answer_id}] }`.
- `saveAnswer({ attemptId, questionId, answerId })` — upsert into `user_answers`, compute `is_correct` server-side by looking up the answer.
- `finalizeAttempt({ attemptId })` — set `completed_at`, compute `score` from stored answers, return summary.
- `abandonAttempt({ attemptId })` — optional, for "start over" button.

### Quiz UI changes (`src/routes/exams.$slug.take.tsx`)
- On mount (paid/authenticated flow only), call `startOrResumeAttempt` and hydrate:
  - selected answers map
  - jump `currentIndex` to first unanswered question
- On answer select, fire `saveAnswer` (fire-and-forget with a small toast on failure). Keep existing immediate correct/incorrect feedback — the server already returns `is_correct`.
- Submit button calls `finalizeAttempt` instead of doing the batch insert currently used.
- If a resumed attempt exists, show a small banner: "Resumed from {date} — {n}/{total} answered" with an "Start over" link that calls `abandonAttempt` then reloads.

### Dashboard integration
- `getUpNext` in `src/lib/dashboard.functions.ts`: prefer any in-progress attempt over the "recent activity" heuristic. Show a "Resume" badge on the Up Next card.

### Scope guards
- Owner preview route (`/preview/exam/$slug`) and freemium 10-question preview are **not** auto-saved — they don't create `user_attempts` today and stay that way.
- No UI changes to the admin editor or dashboard layout beyond the "Resume" badge.

### Files touched
- New: `supabase/migrations/<ts>_user_answers_unique.sql`, `src/lib/attempts.functions.ts`
- Edit: `src/routes/exams.$slug.take.tsx`, `src/lib/dashboard.functions.ts`
