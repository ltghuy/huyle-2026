---
id: 041
feature: arena-community
created: 2026-11-12
---

# Decisions: "Cộng đồng" in the Arena

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### Keeping the list current

- **Question:** Should the list update by itself while open, or on a refresh?
- **Decision:** A "Làm mới" button; the list loads when the page opens and when it is tapped.
- **Rationale:** Owner's choice (2026-11-12). It is the cheapest on the Workers free plan.
- **Caveats:** A room can fill between loads; joining it then says why and reloads (AC-011).

### When a public room is hidden

- **Question:** Besides the match starting, when does a public room leave the list?
- **Decision:** While it has no free seat (it comes back if a seat frees up in the lobby), and when it closes. The host can't take it off the list.
- **Rationale:** Owner's choice (2026-11-12): "no free seat" picked, "host turns it off" not picked.
- **Caveats:** If hosts ask to hide a room again, add an off switch; the flag is already a boolean.

### What a row shows

- **Question:** Which details, and are there filters?
- **Decision:** Host name and avatar, kind, mode, level, rounds, seats taken; filters for kind and level, the level starting at the learner's.
- **Rationale:** Owner's choice (2026-11-12).

### Who can join

- **Question:** Everyone, or friends only?
- **Decision:** Any signed-in learner, through the same join as a code.
- **Rationale:** Owner's choice (2026-11-12); it matches "any online learner" in the request.

## Tentative

### After a match

- **Question:** Is a room that was public still public after its match, when the players are back in the lobby?
- **Tentative Decision:** No. Starting a match clears the flag; the host can make the next lobby public again.
- **Revisit when:** hosts say they keep re-publishing the same room.

### Own room in the list

- **Question:** Should the learner's own public room be listed for them?
- **Tentative Decision:** Yes, marked "Phòng của bạn", with "Quay lại phòng" (a host back from another tab gets their seat back through the usual join).
- **Revisit when:** it confuses hosts.
