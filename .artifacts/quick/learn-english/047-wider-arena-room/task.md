---
slug: wider-arena-room
status: done
branch: main
created: 2026-11-05
---

# Quick Task: Wider Arena room

## What

On a desktop screen the Arena room looked narrow: the duel sat in a 672 px column and the lobby in a 448 px one. Widen both.

## Files

- apps/learn-english/src/components/arena/room-screen.tsx: room `main` from `max-w-2xl` to `max-w-4xl`
- apps/learn-english/src/components/arena/lobby.tsx: lobby column from `max-w-md` to `max-w-2xl`

## Expected Outcome

The room (header, scoreboard, question card) is up to 896 px wide and the lobby (code, players, Ready button) up to 672 px. Phones are unchanged, since both containers already fill the screen there.

## Quality Gates

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
