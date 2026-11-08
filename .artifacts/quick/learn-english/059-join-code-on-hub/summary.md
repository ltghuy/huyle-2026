---
slug: join-code-on-hub
completed: 2026-11-08
---

# Summary: Join by room code from the Arena hub

## What Changed

A learner with a code from a friend had to open "Đấu 1-1" first and scroll past the whole room setup to find the code entry. The hub now has a full-width "Vào phòng bằng mã" card between the mode cards and "Lịch sử đấu": a key icon, the title and one line on the left, then the six code tiles and a primary "Vào phòng" button on the right from `lg`, stacked below that. A signed-in learner's code is still checked with the server and a wrong one is said under the tiles. A guest goes straight to the room, whose sign-in prompt takes over. `/arena/1v1` lost its divider and join section, and the hero and the 1-1 page description say where joining lives now. Feature 024 AC-005 records the change.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/arena/join-room.tsx` | `JoinRoom` is now the hub card (icon, title, line, tiles, primary button); guests skip the server check |
| `apps/learn-english/src/components/arena/arena-hub.tsx` | The card sits between the modes and the history |
| `apps/learn-english/src/components/arena/duel-setup.tsx` | Dropped the "Hoặc có mã phòng?" divider and the join section |
| `apps/learn-english/src/app/(app)/arena/page.tsx` | Hero line mentions joining by code |
| `apps/learn-english/src/app/(app)/arena/1v1/page.tsx` | Description no longer mentions joining |
| `apps/learn-english/src/components/arena/arena-hub.test.tsx` | Join tests run on the hub, a guest test added, the 1-1 test checks the entry is gone |
| `.artifacts/features/learn-english/024-arena-modes/spec.md` | AC-005 reworded |

## Patterns Discovered

None.

## Follow-Up

None. Checked by screenshot at 1280 and 375 px (dark, guest).
