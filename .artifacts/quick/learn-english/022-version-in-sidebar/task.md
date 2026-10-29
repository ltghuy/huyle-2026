---
slug: version-in-sidebar
status: done
branch: feature/learn-english
created: 2026-10-29
---

# Quick Task: App version in the sidebar

## What

Show the app version from `apps/learn-english/package.json` (for example `v0.1.0`) at the right end of the "Nguồn dữ liệu" row in the sidebar footer.

## Files

- `apps/learn-english/next.config.ts` (exposes the version as `NEXT_PUBLIC_APP_VERSION` at build time)
- `apps/learn-english/src/components/shell/app-sidebar.tsx`

## Expected Outcome

The expanded sidebar shows "Nguồn dữ liệu" on the left and the version, small and muted, on the right of the same row. The collapsed sidebar shows only the icon. The version is inlined at build time, so the client bundle doesn't include `package.json`.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
