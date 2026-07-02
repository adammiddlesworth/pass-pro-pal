## Goal

Add a topic layer to the Real Estate track on the dashboard. When a user picks Real Estate, they see a grid of ~25 topic tiles (Principles, Legal Descriptions, Agency, Finance, etc.). Clicking a topic then shows the practice exams tagged with that topic. Life & Health Insurance is unchanged for now.

## Approach

Reuse the existing `exam_tags` table — each exam is tagged with one or more topic slugs, and topics are the filter, not a new table. This keeps admin editing simple (tags already exist in the admin UI) and lets one exam appear under multiple topics if needed.

Topics are defined as a static, curated list in code (slug + label + category). No migration needed — we just query `exams` joined with `exam_tags` where `tag = <topic slug>`.

## Changes

**1. `src/lib/topics.ts` (new)**
Export `REAL_ESTATE_TOPICS`: array of `{ slug, label }` for all 25 topics the user listed. Slugs are kebab-case (e.g. `real-estate-principles`, `legal-descriptions`, `agency-relationships`). Also export `LIFE_HEALTH_TOPICS` as empty for now (future extensibility).

**2. `src/lib/dashboard.functions.ts`**
Add a `topic?: string` param to `searchExams`. When provided, filter results to exams that have a matching row in `exam_tags` with `tag = topic`. Keep existing search-by-title/tag behavior when `q` is set.

**3. `src/routes/_authenticated/dashboard.tsx`**
Add a third view state alongside the existing "no category" and "category selected" views:
- No `cat` → track chooser (unchanged)
- `cat=real_estate` and no `topic` → topic grid (25 tiles for RE; simple list). Search bar filters topic labels client-side.
- `cat=real_estate&topic=<slug>` → existing exam results view, filtered by topic; breadcrumb shows Track › Topic
- `cat=life_health_insurance` → current exam list (unchanged, since no topics defined yet)

Add `topic` to the route's `validateSearch` zod schema as an optional string.

**4. Admin exam editor (`src/routes/_authenticated/admin.exams.tsx`)**
No structural change required — tags already editable. Optionally surface the canonical topic list as suggestions in the tag input. (Nice-to-have; skip if it complicates the form.)

## Out of scope

- No database migration.
- No changes to Life & Health dashboard.
- No seeding of exams into topics — you'll assign topics via the admin UI (or I can seed a few for testing if you want).

## Open question

Should the topic tiles show a count of available exams (e.g. "12 exams")? This requires an extra aggregate query — small cost, nicer UX. I'll include it unless you'd rather keep it minimal.
