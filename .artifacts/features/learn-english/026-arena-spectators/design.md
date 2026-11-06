# Design: Arena spectators (026)

## Approach

Spectators live in the room's state next to the players, in a separate list, so every
existing rule that looks at `players` (scoring, Ready, rematch, round winner, forfeit)
keeps ignoring them without change.

### Rules (`src/learning/arena/machine.ts`)

- `RoomState.spectators: PlayerIdentity[]`: connected spectators only. `MAX_SPECTATORS = 3`
  in `protocol.ts`, shared with the join service.
- `join`: a seated player comes back as before. A listed spectator (another tab) gets a
  `replace` effect. Otherwise: lobby with a free seat seats a player (AC-002); else fewer
  than three spectators adds one (AC-001); else close with `MESSAGES.full` (AC-003).
  `MESSAGES.started` goes: a started room is now watched, not refused.
- `disconnect`: a spectator is removed at once, no grace (AC-008).
- `leave`: a spectator is removed and their sockets closed; it never reaches `forfeit`
  (AC-006). `forfeit` itself also ignores an id that isn't a player.
- `start`: ignored from anyone who isn't a player. The other events already check `players`.
- `toPublic` adds `spectators: { id, name }[]`.
- Rooms saved before the change have no `spectators`: the Durable Object fills `[]` when it
  loads the state.

### Join route (`arena.service.ts`)

`RoomStatus` adds `spectatorIds`. `joinRoom`: seated or spectating → ticket; lobby with a free
seat → ticket; fewer than `MAX_SPECTATORS` spectators → ticket; else `full`. The `started`
reason and its message go. The room re-checks on the socket, so a race between two joiners
ends with the room refusing the late one.

### Screens (`src/components/arena/`)

A viewer is a spectator when they aren't in `room.players`. Components keep taking the real
`me`; where they fell back on "the player who isn't me" they now pick the left side as
"me if I play, else the first player (the creator)":

- `room-screen.tsx`: "Rời phòng" for spectators in every phase (no forfeit dialog), the
  "N người đang xem" count, a "Bạn đang xem trận đấu" banner.
- `lobby.tsx`: spectators see both seats ("Người chơi" label) and the Ready state, no buttons,
  no invite panel.
- `scoreboard.tsx`, `results.tsx`: left/right from the side helper; `score()` takes the left id.
  `MatchResult` for spectators shows the winner and rounds with only "Về Đấu trường" (no stats
  fetch, no rematch).
- `answer-reveal.tsx`: names the scorer from the players list instead of "the rival".
- `duel.tsx`: spectators get every player's typing/wrong status, read-only question views
  (`watching`), and a plain leave.
- `question-views.tsx`: `watching` disables picks and keys and hides the inputs' send row.
- `announcer.tsx` already names players by id and needs nothing.
