## Why /admin/exams feels broken

The page loads and lets you create/edit exam **metadata** (title, slug, YouTube link, tags), but there is **no UI for questions and answers**. Every exam you create there ends up with 0 questions, so nothing shows in the app. That's the "not working" — it's a missing feature, not a broken route.

## What I'll add

### 1. Paste-to-import (primary workflow)
On any exam's edit page, a new "Import Questions" panel with:
- A large textarea that accepts **TSV pasted straight from Google Sheets / Excel / Claude**, or CSV.
- Expected columns (header row required, order flexible):
  `question, choice_a, choice_b, choice_c, choice_d, correct, explanation`
  - `correct` = `A` / `B` / `C` / `D` (case-insensitive)
  - `explanation` optional
  - Supports 2-6 choices (blank choice columns are skipped)
- Live preview table showing parsed rows + row-level validation errors before import.
- "Replace all questions" vs "Append" toggle.
- One-click import — writes questions + answers in a single server call.

I'll also include a **"Copy template"** button that puts the header row on your clipboard so you can paste it into Sheets/Claude and fill it in.

### 2. Per-question manual editor (for tweaks)
Below the importer, a list of the exam's existing questions with:
- Inline edit of question text, choices, correct answer, explanation.
- Add / delete individual questions.
- Reorder via up/down buttons.

### 3. Small quality-of-life fixes on the exams list
- Show question count with a warning badge when it's 0 (so empty exams are obvious).
- "Duplicate exam" button (clones metadata + questions) — handy for making variant #38 from #37.

## Technical details

**New server functions** in `src/lib/admin.functions.ts` (all `requireSupabaseAuth` + `assertAdmin`):
- `listExamQuestions({ examId })` — returns questions + answers ordered by `position`.
- `importExamQuestions({ examId, mode: "replace" | "append", rows: ParsedRow[] })` — bulk insert; on `replace` deletes existing questions first (cascade removes answers).
- `upsertQuestion({ examId, id?, prompt, explanation, choices: [{ text, is_correct }] })` — single question CRUD.
- `deleteQuestion({ id })`.
- `reorderQuestions({ examId, orderedIds })`.
- `duplicateExam({ id })` — copies exam row + tags + questions + answers under a new slug.

**Parser** in a new `src/lib/question-import.ts` (pure, unit-testable):
- Auto-detects delimiter (tab vs comma) from the first line.
- Handles quoted fields with embedded commas/newlines.
- Normalizes headers (lowercase, strip spaces/underscores) so `Choice A` / `choice_a` / `A` all map to the same column.
- Returns `{ rows: ParsedRow[], errors: { row: number, message: string }[] }`.

**UI** — extend `src/routes/_authenticated/admin.exams.tsx` (or split into `admin.exams.$id.tsx` if the file gets long) with:
- `<QuestionImporter examId=... />` — textarea + parse preview + import button.
- `<QuestionList examId=... />` — inline editable rows using existing shadcn `Input` / `Textarea` / `Button`.

**No schema changes** — existing `questions` (with `position`) and `answers` tables already support everything above.

## Out of scope for this pass
- CSV file upload (paste covers 95% of the flow; can add later).
- Image attachments on questions.
- AI-assisted question generation.

Want me to also add a "Preview exam" link from the editor so you can jump straight into the quiz UI as the owner after importing? (Uses the existing `/preview/exam/$slug?token=...` route.)
