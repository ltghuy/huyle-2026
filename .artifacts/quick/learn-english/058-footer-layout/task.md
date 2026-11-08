---
slug: footer-layout
status: done
branch: main
created: 2026-11-08
---

# Quick Task: Balance the footer layout

## What

The donation card sat alone at the left of the footer, a third of its width, above an unrelated copyright row. Lay the footer out in two rows: the app's name and what it is on the left with the donation card on the right, then the copyright, decree note and legal links under a divider.

## Files

- `apps/learn-english/src/components/shell/site-footer.tsx`
- `.artifacts/features/learn-english/029-legal-pages/spec.md` (AC-006 wording)

## Expected Outcome

- From `md`: name (with the sidebar's graduation cap) and one line on the left, the donation card (up to 28 rem) on the right, both centred on one row; the copyright row below, links on the right.
- On phones everything stacks: name and line, the card at full width, then the copyright and links.
- The donation text drops "Ứng dụng miễn phí và không có quảng cáo", which now sits in the line beside the name.

## Quality Gates

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
