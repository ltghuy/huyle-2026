---
slug: version-in-sidebar
completed: 2026-10-29
---

# Summary: App version in the sidebar

## What Changed

`next.config.ts` reads `version` from `package.json` and sets `env.NEXT_PUBLIC_APP_VERSION`, which Next inlines at build time. The sidebar footer's "Nguồn dữ liệu" row now ends with a `ml-auto` span showing `v{version}`, in the row's muted `text-xs` style with tabular figures. It is hidden when the sidebar is collapsed, like the label.

Checked on the dev server: /credits renders `v0.1.0` in the sidebar.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/next.config.ts` | Exposes the package version as `NEXT_PUBLIC_APP_VERSION` |
| `apps/learn-english/src/components/shell/app-sidebar.tsx` | Version at the right end of the "Nguồn dữ liệu" row |

## Patterns Discovered

None.

## Follow-Up

None. Bumping `version` in `package.json` updates the sidebar on the next build.
