---
slug: join-code-on-hub
status: done
branch: main
created: 2026-11-08
---

# Quick Task: Join by room code from the Arena hub

## What

Move "Vào phòng bằng mã" from the bottom of `/arena/1v1` to a full-width card on the hub (`/arena`), between the mode cards and "Lịch sử đấu", so a learner with a code doesn't have to open the 1-1 setup first.

## Files

- `apps/learn-english/src/components/arena/join-room.tsx` (the form becomes the hub card; guests go straight to the room, which asks them to sign in)
- `apps/learn-english/src/components/arena/arena-hub.tsx` (the card between the modes and the history)
- `apps/learn-english/src/components/arena/duel-setup.tsx` (drop the divider and the join section)
- `apps/learn-english/src/app/(app)/arena/page.tsx`, `apps/learn-english/src/app/(app)/arena/1v1/page.tsx` (copy)
- `apps/learn-english/src/components/arena/arena-hub.test.tsx`
- `.artifacts/features/learn-english/024-arena-modes/spec.md` (AC-005)

## Expected Outcome

- The hub shows a "Vào phòng bằng mã" card under the two mode cards: an icon, the title and a short line, the six code tiles and "Vào phòng". From `lg` the text sits left and the tiles and button right; below that everything stacks.
- A signed-in learner's code is checked with the server first and a wrong one is said under the tiles (feature 023 AC-005 messages unchanged). A guest goes to the room, whose sign-in prompt already handles them.
- `/arena/1v1` has the VS panel and the record only.

## Quality Gates

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`
