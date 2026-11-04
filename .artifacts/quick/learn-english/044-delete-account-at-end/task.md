---
slug: delete-account-at-end
status: done
branch: main
created: 2026-11-04
---

# Quick Task: "Xóa tài khoản" at the end of Settings

## What

Move "Xóa tài khoản" out of the account card to the end of the Settings page, below "Hướng dẫn và quyền riêng tư", so the destructive action sits apart from everyday settings. The flow (backup offer, confirm, delete, clear device) is unchanged; feature 022 AC-022 and AC-023 still hold, with the two actions now in different places.

## Files

- apps/learn-english/src/components/settings/delete-account.tsx: new, the button and its dialog, full width, shown only when signed in or expired
- apps/learn-english/src/components/settings/use-leave-account.ts: new, clears the device and re-reads the session, shared by sign-out and delete
- apps/learn-english/src/components/settings/account-card.tsx: delete removed, sign-out only
- apps/learn-english/src/app/(app)/settings/page.tsx: `<DeleteAccount />` after the last card
- apps/learn-english/src/components/settings/{account-card,delete-account}.test.tsx: delete tests moved, guest case added

## Expected Outcome

A signed-in learner sees "Đăng xuất" in the account card and "Xóa tài khoản" as the last item on the page. A guest sees no delete button.

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm test
