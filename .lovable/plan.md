Two connected changes: rework the freemium model so every exam is previewable, and add adaptive "Weak Spots" review as a paid feature.

## 1. Freemium: first 10 questions of any exam

Today there are dedicated "sample" exams (10 Qs) and separate "full" exams behind purchase. That doesn't scale to 100+ exams per category. New model:

- Every exam is a single full exam. No more sample/full split.
- Any signed-in user can start any exam.
- After answering question 10, if the user hasn't purchased access for that category, the quiz UI shows an upgrade paywall in place of question 11 (with a "Continue with full access" CTA that opens Paddle checkout).
- Purchased users continue seamlessly to the end.
- Progress and score already save per-question, so a free user can come back later, upgrade, and resume where they left off.

Access model stays category-wide: one purchase per track (Real Estate or Life & Health) unlocks every exam in that track — matches the "nobody buys both" decision.

## 2. Weak Spots review (paid only)

For users who have purchased a category, add an adaptive review that pulls their most-missed questions.

- New page: `/exams/review/$category` (paid users only).
- Ranks the user's answered questions by a weakness score: `wrong_count * 2 - correct_count`, tiebreak on most recently missed.
- Pulls top 20 questions from that category's question pool.
- Requires at least 20 answered questions in the category before it unlocks (otherwise not enough signal — shows a "Answer more questions to unlock" state).
- Runs through the standard quiz UI but flagged as a review attempt so it doesn't pollute exam score history.
- Entry points: dashboard card + a button on each category's exam list.

Explicitly excluded from freemium.

## Technical details

**Schema changes (one migration):**
- `exams`: drop `is_sample`, drop unique-per-category sample seeding. Keep `question_count`, `product_id`, `price_cents`.
- `user_attempts`: add `attempt_type text not null default 'exam'` with values `'exam' | 'review'`.
- Backfill: mark existing sample exams as regular exams, keep their questions. Delete the duplicate "sample" exam rows once their questions are merged into the corresponding full exam (or just archive them via a `status = 'archived'` value already in the enum).

**Access check helper:**
- New server fn `hasCategoryAccess({ category })` → checks `purchases` for any `product_id` tied to an exam in that category. Cached per request.
- Existing per-exam access checks call this instead of per-product.

**Quiz UI paywall gate (`src/routes/exams.$slug.take.tsx`):**
- After each answer submission, if `questionIndex >= 10 && !hasAccess`, render `<PaywallPrompt category={exam.category} />` instead of the next question.
- Paywall component reuses the existing Paddle checkout trigger from `exams.$slug.tsx`.

**Weak Spots server fn (`src/lib/review.functions.ts`):**
- `getWeakSpotsExam({ category })` with `requireSupabaseAuth`.
- Verifies category access, verifies ≥20 answered questions.
- SQL: join `user_answers` → `questions` → `exams`, group by `question_id`, compute score, order, limit 20.
- Returns question + answer payload shaped like a normal exam so the quiz UI can render it unchanged.
- Creates a `user_attempts` row with `attempt_type='review'` and a synthetic `exam_id` reference (nullable exam_id, or a dedicated "review" pseudo-exam per category — will use nullable + `attempt_type` for clarity).

**Routing:**
- `src/routes/_authenticated/exams.review.$category.tsx` — new route, loads via `getWeakSpotsExam`, renders quiz UI.
- Dashboard gets a "Review your weak spots" card per purchased category.

**Score history / dashboard:**
- Filter existing history views to `attempt_type = 'exam'` so review sessions don't skew scores. Show review sessions in a separate "Review sessions" list.

**Paddle:**
- No product changes. The two existing category products already grant category-wide access under this model.

## Out of scope

- Topic tagging on questions (deferred until the real question bank arrives — will revisit for topic-scoped reviews).
- Spaced repetition scheduling. Weakness score is a simple ranking, not an SRS algorithm.
- Reducing the weak-spots pool below 20 questions or making the count configurable.
