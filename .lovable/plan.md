# Dashboard, Search & YouTube-linked Exams

## 1. Schema additions (migration)

Add to `exams`:
- `youtube_url text` — full YouTube video URL (nullable)
- `youtube_video_id text` — parsed 11-char id for embed (nullable)
- `exam_number int` — e.g. "Practice Exam #37"

New table `exam_tags`:
- `exam_id uuid` → `exams.id`
- `tag text` (e.g. "contracts", "financing")
- PK `(exam_id, tag)`
- Public SELECT; service_role writes only.

Index: `exams (category, status)`, `exams (slug)` (already unique), `exam_tags (tag)`, GIN/trigram index on `exams.title` for search.

## 2. Dashboard route

New protected route `src/routes/_authenticated/dashboard.tsx` (create the `_authenticated/route.tsx` gate in the same edit — integration-managed pattern).

Layout:
- Two large category cards (Real Estate / Insurance) — clicking sets the active category in URL search param `?cat=real_estate`.
- **Search bar** — search param `?q=` filters exams by title + tag within the chosen category (server fn `searchExams({ category, q })`).
- **Recent activity** — last 5 `user_attempts` with resume link if `completed_at is null`.
- **Weak Spots CTA** — visible only for categories the user has purchased; links to existing `/review/$category`.

Signed-out users hitting `/dashboard` are redirected to `/auth` (existing auth-gate behavior). After sign-in, redirect to `/dashboard` instead of home.

Add "Dashboard" link to the navbar for signed-in users.

## 3. Exam page + YouTube embed

Update `src/routes/exams.$slug.tsx`:
- If `exam.youtube_video_id`, render responsive 16:9 embedded player above the "Start Exam" card — visible to everyone (free + paid + anonymous).
- Show topic tag chips under the title.

Update `src/routes/exams.$slug.take.tsx`:
- Small collapsible "Watch video" panel with the embed, so users can listen while answering.

## 4. YouTube → exam URL convention

Use existing per-exam slug URLs. You paste the exam page URL directly in each YouTube description, e.g.:
`https://passpal.app/exams/re-37-financing`

Recommended slug convention: `{track}-{number}-{topic}` (e.g. `re-37-financing`, `lh-12-annuities`). No redirect layer needed.

## 5. Admin note (not built now)

Exam authoring stays via the existing seed script — add `youtube_url`, `exam_number`, and `tags` to the seed shape. A future admin UI is out of scope for this plan.

## Technical details

- `searchExams` = public server fn using publishable-key client; `ilike` on title + join `exam_tags` for tag matches; returns 20 rows.
- YouTube id parser handles `youtube.com/watch?v=`, `youtu.be/`, and `youtube.com/shorts/` URL shapes; stored at write time so the exam page never parses at render.
- Recent activity fetched via `requireSupabaseAuth` server fn joining `user_attempts` + `exams`.
- `_authenticated/route.tsx` uses `ssr: false` and `supabase.auth.getUser()` redirect to `/auth` (per project auth guard pattern).
