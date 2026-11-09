---
id: 035
feature: friend-challenge
created: 2026-11-09
---

# Decisions: Challenge a friend from the waiting room

## Resolved

### How the friend sees a challenge

- **Question:** toast, modal dialog, or toast plus a bell entry?
- **Decision:** a toast with Chấp nhận / Từ chối and a countdown, on any page
- **Rationale:** doesn't block what the friend is doing; chosen by the owner
- **Caveats:** a missed challenge leaves no trace; revisit if friends ask "who challenged me?"

### Lessons and reviews

- **Question:** is a friend in a focus screen busy?
- **Decision:** no, the toast shows anyway and they decide
- **Rationale:** lesson progress is saved per answer, so leaving costs nothing; chosen by the owner

### Expiry

- **Question:** how long does a challenge wait?
- **Decision:** 30 seconds; the host can cancel earlier
- **Rationale:** matches the Ready window; chosen by the owner

### Delivery channel

- **Question:** the presence pulse runs once a minute; how does a challenge arrive at once?
- **Decision:** a socket per signed-in tab to a per-learner Durable Object
- **Rationale:** the owner asked for a socket; the pulse would take up to a minute
- **Caveats:** every signed-in tab now holds one more socket (hibernated, so idle costs nothing but the connect)

### What "in another room" means

- **Question:** how does the server know the friend is busy?
- **Decision:** each tab tells its socket which room page it has open; any tab with another room open makes the friend busy
- **Rationale:** no change to the room objects, and one source of truth per tab
