---
slug: vocabulary-header
status: done
branch: feature/learn-english
created: 2026-10-27
---

# Quick Task: A calmer vocabulary header

## What

Restyle the top of `/vocabulary` (search, level tabs, learned count, 26 topic chips) so it reads as one tidy panel instead of a wall of outlined boxes.

## Files

- `src/components/vocabulary/vocabulary-browser.tsx`

## Expected Outcome

Search and level tabs share one row from md up. A panel shows the level name ("A1 · Mới bắt đầu"), "Bạn đã học X/Y từ" and a progress bar. Topic chips are borderless pills whose background fills from the left with the share learned; a finished topic shows a check; the selected one is solid primary. From md up, 8 topics show (plus "Tất cả" and the selected topic) with "Xem thêm N chủ đề" / "Thu gọn"; on phones all topics sit in one row that scrolls sideways, scrolled to the selected one. Filtering, counts and accessible names are unchanged.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english e2e`
