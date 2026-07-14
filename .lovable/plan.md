## Problem

Clicking a user row updates the URL to `/admin/users/<id>` but the page keeps showing the users list — the detail page never appears.

**Root cause**: `src/routes/_authenticated/admin.users.tsx` is now a parent route (because `admin.users.$userId.tsx` exists as its child). A parent route must render `<Outlet />` for children to appear, but `admin.users.tsx` renders the full users list component instead. Result: child route matches but has nowhere to render.

## Fix

Rename `src/routes/_authenticated/admin.users.tsx` → `src/routes/_authenticated/admin.users.index.tsx` and update its `createFileRoute` string to `/_authenticated/admin/users/`.

This turns the users list into a proper `/admin/users` leaf, and TanStack Router's implicit parent handles children like `/admin/users/$userId` correctly. No component changes needed beyond the route-string update.

## Files

- `src/routes/_authenticated/admin.users.tsx` → move to `src/routes/_authenticated/admin.users.index.tsx`
- Update `createFileRoute("/_authenticated/admin/users")` → `createFileRoute("/_authenticated/admin/users/")`

`routeTree.gen.ts` regenerates automatically.

## Verification

Navigate to `/admin/users`, click a user row, confirm the detail page (Time studied, Category progress, Attempts, Purchases) renders.
