---
slug: friends-empty-card
status: done
branch: main
created: 2026-11-09
---

# Quick Task: Friends empty state as a card, without the Arena link

## What

Replace the friends list's empty state (text plus a "Vào Đấu trường" link, stretched over the sidebar's free height) with a compact "no friends" card and drop the link; a "Bạn bè" sidebar item is planned separately.

## Files

- apps/learn-english/src/components/social/friends-list.tsx
- apps/learn-english/src/components/social/friends-list.test.tsx
- .artifacts/features/learn-english/031-*/spec.md (AC-016 wording)

## Expected Outcome

With no friends, the sidebar (and the phone Arena card) shows one small bordered card at the top: a users icon, "Bạn chưa có bạn bè nào." and the hint about the Arena, with no link and no large gaps.

## Quality Gates

Run after the change, before marking done:

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test
