## Overview

Build **PassPal**, a freemium web app offering practice exams for two categories:
- **Real Estate Licensing**
- **Life & Health Insurance**

Each category has a free 10-question sample quiz and full practice exams behind a paywall. Users create accounts to track scores, attempts, and progress over time. Exams are designed to be linked directly from YouTube marketing.

## Tech Stack

- TanStack Start (file-based routing, server functions)
- Tailwind CSS + shadcn/ui components
- Lovable Cloud (auth, PostgreSQL, RLS)
- Built-in payments (Stripe or Paddle — TBD by eligibility check)

## Database Schema

### `profiles`
- `id` (uuid, PK, refs `auth.users`)
- `display_name` (text)
- `created_at`, `updated_at`
- Trigger: auto-create on signup

### `exams`
- `id` (uuid, PK)
- `category` (enum: `real_estate`, `life_health_insurance`)
- `title` (text)
- `slug` (text, unique)
- `description` (text)
- `question_count` (int)
- `is_sample` (boolean) — true for the free 10-question quizzes
- `price_cents` (int, nullable) — null for free sample
- `status` (enum: `draft`, `published`)

### `questions`
- `id` (uuid, PK)
- `exam_id` (uuid, refs `exams`)
- `text` (text)
- `explanation` (text) — shown after answering
- `order_index` (int)

### `answers`
- `id` (uuid, PK)
- `question_id` (uuid, refs `questions`)
- `text` (text)
- `is_correct` (boolean)
- `order_index` (int)

### `user_attempts`
- `id` (uuid, PK)
- `user_id` (uuid, refs `auth.users`)
- `exam_id` (uuid, refs `exams`)
- `started_at` (timestamptz)
- `completed_at` (timestamptz, nullable)
- `score` (int, nullable) — number correct
- `total` (int) — total questions

### `user_answers`
- `id` (uuid, PK)
- `attempt_id` (uuid, refs `user_attempts`)
- `question_id` (uuid, refs `questions`)
- `answer_id` (uuid, refs `answers`)
- `is_correct` (boolean)
- `answered_at` (timestamptz)

## Pages & Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page with hero, exam categories, CTA to sign up |
| `/exams` | Browse all exams by category |
| `/exams/$slug` | Exam detail page (description, question count, start button) |
| `/exams/$slug/quiz` | Active quiz interface (one question at a time, progress bar, timer optional) |
| `/exams/$slug/results` | Results page with score, correct/incorrect breakdown, explanations |
| `/dashboard` | User dashboard: history, scores, progress stats |
| `/pricing` | Paywall page showing full exam access pricing |
| `/auth` | Login / signup (email + Google) |
| `/reset-password` | Password reset flow |

## Auth

- Email/password + Google OAuth (via Lovable Cloud broker)
- User profiles table with auto-create trigger
- Protected routes under `/_authenticated/` (dashboard, quiz for paid exams)

## Exam Flow

1. **Free sample**: any visitor or signed-in user can take the 10-question sample quiz for each category.
2. **Full exam**: requires purchase. Unauthenticated users are prompted to sign up; authenticated but unpaid users see the pricing page.
3. **Quiz UI**: single question per screen, selectable answers, "Next" / "Submit", progress bar, optional timer.
4. **Results**: immediate score, review mode with explanations.
5. **Dashboard**: list of all attempts with scores, dates, and category breakdown.

## Payments

- Freemium: free sample quizzes; full exams require one-time purchase or bundle.
- Run `recommend_payment_provider` to choose between Paddle and Stripe.
- Enable payments, create products for:
  - Real Estate Full Exam Access
  - Life & Health Insurance Full Exam Access
  - Bundle (both categories)
- Gate full exam routes on purchase status; show pricing CTA if not purchased.

## Seed Data

- Insert 2 sample exams (1 per category, 10 questions each) with realistic placeholder questions so the app is fully demoable.
- Insert 2 full exams (1 per category, ~50 questions each) with placeholder questions.
- All questions have 4 answer choices and explanations.

## YouTube Marketing Integration

- Each exam detail page (`/exams/$slug`) is the canonical landing URL for YouTube CTAs.
- Clean URLs, fast load, mobile-friendly quiz UI.
- OG tags per exam for social sharing.

## Design Direction

- Clean, focused, exam-study aesthetic — minimal distractions.
- Clear progress indicators and encouraging feedback.
- Mobile-first: many users will arrive from YouTube on mobile.

## Implementation Order

1. Enable Lovable Cloud.
2. Run `recommend_payment_provider`, then enable chosen payment provider.
3. Create database tables via migration.
4. Set up auth (profiles, Google OAuth).
5. Seed sample and full exam placeholder data.
6. Build public pages: landing, exam browser, exam detail, free sample quiz flow.
7. Build auth-protected pages: dashboard, full exam quiz flow.
8. Integrate payments and paywall gating.
9. Polish: results review, OG tags, mobile QA.