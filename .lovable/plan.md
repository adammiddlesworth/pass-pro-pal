## Owner-only quiz preview

Add a hidden preview mode so you (as owner) can walk through the question-by-question quiz UI without signing in. Public behavior stays unchanged: real users still hit the sign-in gate.

### How it works

- New env var `OWNER_PREVIEW_TOKEN` (server-only secret).
- New public route `/preview/exam/$slug?token=...` that renders the same quiz interface as `/exams/$slug/take`, but:
  - Validates the token server-side (timing-safe compare) in a `createServerFn`.
  - Loads exam questions via a server function that requires the token (not sign-in).
  - Never writes to `user_attempts` or `user_answers` — purely visual walkthrough.
  - Shows a small "Preview mode (not saved)" banner.
  - Ignores the 10-question paywall so you can view the full flow.

### Files

- `src/lib/preview.functions.ts` — `getPreviewExam({ slug, token })` server fn; timing-safe token check; returns exam + all questions + answers.
- `src/routes/preview.exam.$slug.tsx` — public route, reads `?token=` from search params, renders quiz UI (extracted/shared from existing take page), no DB writes.
- Refactor: extract the pure question-rendering pieces from `src/routes/exams.$slug.take.tsx` into a shared `QuizRunner` component so both routes render identically without duplicating logic.

### Usage

Once shipped, visit:
`/preview/exam/real-estate-full?token=<OWNER_PREVIEW_TOKEN>`

Bookmark it. Anyone without the token gets a 404-style "Not found" — the route reveals nothing.

### Not included

- No changes to sign-in gating on the real `/exams/*/take` flow.
- No changes to freemium logic, payments, or DB schema.
