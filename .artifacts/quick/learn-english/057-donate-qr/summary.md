---
slug: donate-qr
completed: 2026-11-08
---

# Summary: The owner's donation QR in the footer

## What Changed

The footer of every page with navigation now opens with a "Ủng hộ Tuxedo English" card: the owner's MoMo / VietQR code, one line on why, and "Mở mã QR để lưu ảnh", which opens the full image so a learner on a phone can save it and scan it from the gallery. The code itself links to the full image too. The footer image is a 400 px crop of the white code card, taken inside its pink rounded border; the first crop cut through the border and left pink corners, which the owner spotted. The page draws its own rounded corners and a thin ring. The terms gain "8. Ủng hộ" (voluntary, not refundable, unlocks nothing), and the privacy page lists MoMo or the learner's bank as a third party only when the learner sends money, since the app never sees payment details.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/public/donate/momo-qr-card.webp`, `momo-qr.jpg` | Footer crop (30 KB) and full image at 624 px (51 KB) |
| `apps/learn-english/src/components/shell/site-footer.tsx`, `site-footer.test.tsx` | Donation card and its test |
| `apps/learn-english/src/app/(app)/terms/page.tsx`, `page.test.tsx` | "Ủng hộ" section |
| `apps/learn-english/src/app/(app)/privacy/page.tsx` | MoMo or bank as a third party when donating |
| `.artifacts/features/learn-english/029-legal-pages/spec.md` | Donations no longer out of scope; AC-004 and AC-006 mention them |

## Patterns Discovered

None.

## Follow-Up

- The QR shows the account holder's name and photo, as in the owner's image.
- A new QR image needs its own crop: this one is the box (366, 404, 882, 946) of the 1248 × 1365 original, resized to 400 px wide.
