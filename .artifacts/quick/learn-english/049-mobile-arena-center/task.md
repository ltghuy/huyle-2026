---
slug: mobile-arena-center
status: done
branch: main
created: 2026-11-05
---

# Quick Task: Arena in the middle of the mobile bar

## What

The phone bottom bar becomes Hôm nay · Từ vựng · Đấu trường · Ôn tập · Thêm, with "Đấu trường" as a raised round button in the middle; "Bài tập" moves into the "Thêm" sheet.

## Files

- apps/learn-english/src/components/shell/nav.ts
- apps/learn-english/src/components/shell/mobile-nav.tsx

## Expected Outcome

- The bar shows its tabs in the order above, whatever order the sidebar uses.
- "Đấu trường" is a primary-coloured circle that sits a little above the bar, with its label under it, and it shows when it is the current page.
- "Bài tập" is listed in the "Thêm" sheet, and "Thêm" is highlighted while you are on it.

## Quality Gates

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test
- pnpm --filter learn-english build
