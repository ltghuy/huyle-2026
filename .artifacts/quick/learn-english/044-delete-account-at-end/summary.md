---
slug: delete-account-at-end
completed: 2026-11-04
---

# Summary: "Xóa tài khoản" at the end of Settings

## What Changed

"Xóa tài khoản" and its confirm dialog moved into `DeleteAccount`, which Settings renders full width after "Hướng dẫn và quyền riêng tư". It reads the account status itself and renders nothing for guests or while the status is unknown. The account card keeps the profile and "Đăng xuất". Both flows share `useLeaveAccount` for clearing the device and re-reading the session.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/settings/delete-account.tsx | new |
| apps/learn-english/src/components/settings/use-leave-account.ts | new |
| apps/learn-english/src/components/settings/account-card.tsx | delete removed |
| apps/learn-english/src/app/(app)/settings/page.tsx | renders `DeleteAccount` last |
| apps/learn-english/src/components/settings/account-card.test.tsx | delete tests moved out |
| apps/learn-english/src/components/settings/delete-account.test.tsx | new, delete tests plus guest case |

## Follow-Up

None.
