# Admin: Users & Progress

Add a new admin page at `/admin/users` that lists all users and lets you drill into any user to see everything they've completed.

## Access control

- Reuse the existing admin gate (`has_role(user, 'admin')`) via `checkIsAdmin` in `src/lib/admin.functions.ts`.
- All data reads happen in new server functions using `supabaseAdmin` after verifying the caller is an admin — no schema/RLS changes needed.

## Server functions (new file `src/lib/admin-users.functions.ts`)

1. `listUsers({ search?, limit, offset })` — returns users from `auth.users` (via `supabaseAdmin.auth.admin.listUsers`) joined with `profiles` (display_name, active_track, test_date) and aggregate stats:
   - total attempts, completed attempts, average score, last active date, current streak, purchases count.
2. `getUserDetail({ userId })` — returns:
   - Profile + email + roles
   - Purchases (product, amount, status, date)
   - Attempts list (exam title, type, score/total, started/completed timestamps)
   - Per-category progress rollup (attempts + accuracy)
   - Recent answers (last 50 with question preview + correct/incorrect)
   - Streak info

## UI (new routes)

- `src/routes/_authenticated/admin.users.tsx` — searchable/sortable table: name, email, track, attempts, avg score, last active. Row click → detail page. Redirects non-admins to `/dashboard`.
- `src/routes/_authenticated/admin.users.$userId.tsx` — user detail with tabs/sections: Overview, Attempts, Purchases, Activity. Uses shadcn Card/Table/Tabs already in the project.
- Add an "Users" link next to the existing "Exams" admin nav on `/admin/exams`, and an "Admin" entry point from the dashboard when the user is admin (if not already present).

## Technical notes

- Use `useServerFn` + TanStack Query pattern (matches `admin.exams.tsx`).
- Pagination: server-side, 50/page.
- No new DB migrations required — all queries go through existing tables (`profiles`, `user_attempts`, `user_answers`, `purchases`, `user_streaks`, `user_roles`, `exams`, `questions`).
- Emails come from `supabaseAdmin.auth.admin.listUsers()` / `getUserById()`.

## Out of scope

- Editing user data, impersonation, exporting CSVs, or granting/revoking roles (can be added later if you want).
