## Goal

Let admins flag a specific exam as the diagnostic for each track (Real Estate, Life & Health). When a user takes the diagnostic for that category, use every question from the flagged exam instead of auto-picking questions from every published exam.

## Schema

Add `is_diagnostic boolean not null default false` to `public.exams`.

Enforce "one flagged exam per category" with a partial unique index:
```
create unique index exams_one_diagnostic_per_category
  on public.exams (category) where is_diagnostic;
```
The admin form will also clear the flag on any other exam in the same category before saving, so toggling it on is one click (no unique-violation error).

## Admin UI (`src/routes/_authenticated/admin.exams.tsx`)

- Add a "Use as diagnostic exam" checkbox in the exam form, right next to the existing "Sample" toggle.
- On save, if the checkbox is on, first `UPDATE exams SET is_diagnostic=false WHERE category=<cat> AND id<>this` (server fn using admin client), then set `is_diagnostic=true` on the current exam.
- Show a small "Diagnostic" badge in the exam list next to the existing "Sample" badge.

## Diagnostic flow (`src/lib/diagnostic.functions.ts`)

Inside `startDiagnostic`, before the current auto-pick logic:
1. Look up the flagged exam: `exams` where `category = data.category AND is_diagnostic = true AND status = 'published'`.
2. If found, load all its questions in `order_index` order, tag each question with its exam topic (via `exam_tags`) so topic-level scoring still works, insert the `user_attempts` row with `exam_id` set to that exam, and return that list. No 20-cap, no random pick.
3. If none is flagged, fall back to today's auto-selection so nothing breaks for tracks the admin hasn't set up yet.

The rest of the diagnostic pipeline (`completeDiagnostic`, report page, one-per-user rule) is unchanged.

## Verification

1. In `/admin/exams`, open one of your new diagnostic exams, tick "Use as diagnostic exam", save. Repeat for the other category.
2. As a fresh user (no prior diagnostic), open `/diagnostic/real_estate` → the questions shown match the flagged exam, in the exam's own order, and the count equals the exam's `question_count`.
3. Complete it → results page renders with topic breakdown as before.
4. Untick the flag → next new user's diagnostic falls back to the auto-selected 20-question sample.

## Technical details

- Migration adds the column + partial unique index; no data backfill needed (defaults to false).
- Admin server fn that toggles the flag uses `supabaseAdmin` guarded by `requireSupabaseAuth` + `has_role('admin')`, matching the existing admin.exams pattern.
- Topic labels for questions in the diagnostic exam come from `exam_tags` on that exam (already how the auto-pick logic groups questions), so `weakestTopics` / `strongestTopics` continue to work.
