---
slug: donate-qr
status: done
branch: main
created: 2026-11-08
---

# Quick Task: The owner's donation QR in the footer

## What

Every page with navigation shows the owner's MoMo / VietQR code in the footer, so learners who want to can support the app, and the terms and privacy pages say how donations work.

## Files

- `apps/learn-english/public/donate/momo-qr-card.webp` and `momo-qr.jpg` (from the owner's `donate-qr.jpg`)
- `apps/learn-english/src/components/shell/site-footer.tsx` and its test
- `apps/learn-english/src/app/(app)/terms/page.tsx` and its test, `src/app/(app)/privacy/page.tsx`
- `.artifacts/features/learn-english/029-legal-pages/spec.md` (donations were out of scope)

## Expected Outcome

- The footer opens with a card: the QR (a 400 px crop of the white code card, inside its pink border, shown at 112 to 128 px with a rounded ring), "Ủng hộ Tuxedo English", one line on why, and "Mở mã QR để lưu ảnh" to the full image, so a learner on a phone can save it and scan it from the gallery. The QR also links to the full image.
- Terms gain "8. Ủng hộ": voluntary, not refundable, unlocks nothing, not a contract for a service.
- Privacy's third parties list MoMo or the learner's bank, only when they send money themselves; the app never sees payment details.

## Quality Gates

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`
