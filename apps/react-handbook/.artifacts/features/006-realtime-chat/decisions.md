---
id: "006"
feature: realtime-chat
created: 2026-10-07
---

# Decisions: Real-Time Chat UI

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### Participants

- **Question:** Who is on the other side of the conversation in the demo?
- **Decision:** Simulated participants that post on their own and reply to the user, plus every open tab joining the same room as a real participant.
- **Rationale:** One tab is enough to see live activity; two tabs prove real cross-client delivery.
- **Caveats:** None.

### Scope of extras

- **Question:** Which capabilities beyond live stream, optimistic send and auto-scroll?
- **Decision:** All four: reconnect + catch-up, older history upward, typing indicators, unread jump + read state.
- **Rationale:** Each is a distinct real-time technique the learner wants to practice.
- **Caveats:** This makes the feature Complex scope.

### Rooms

- **Question:** One conversation or several?
- **Decision:** One room.
- **Rationale:** Keeps the practice focused on stream, ordering and scrolling.
- **Caveats:** None.

### Identity

- **Question:** How does the user's identity work?
- **Decision:** A random display name per browser, editable and remembered; own messages are identified per tab, not per name.
- **Rationale:** Makes multi-tab demos readable without accounts.
- **Caveats:** None.

### Meaning of "seen"

- **Question:** Does "seen" on the user's message mean any other participant, or only another real tab?
- **Decision:** Any other participant, simulated ones included. A simulated participant "sees" a message a few seconds after it arrives; another tab sees it when its view reaches the message while the tab is visible.
- **Rationale:** The state can be shown from a single tab; two tabs still show the real path.
- **Caveats:** None.

### Unread lifetime

- **Question:** Do the unread divider and count survive leaving and returning?
- **Decision:** Current visit only; leaving the practice or reloading clears them.
- **Rationale:** No storage needed; the practice is about live unread tracking, not sync of read position.
- **Caveats:** None.

### Replay window

- **Question:** How many messages does the server keep for reconnect catch-up?
- **Decision:** The last 500. A reconnect asking for anything older reloads the latest page and marks that earlier messages may be missing.
- **Rationale:** Covers normal drops; the fallback path stays reachable with long outages plus burst activity.
- **Caveats:** None.

### Pending and failed messages across reloads

- **Question:** What happens to messages still sending or failed when the user reloads or leaves?
- **Decision:** Kept per browser until resolved and shown again on return; still-sending ones are re-sent, failed ones stay retryable. Re-sends reuse the same message id, so a send that already reached the server is never duplicated.
- **Rationale:** The user never loses typed text, and it practices idempotent retries.
- **Caveats:** Adds AC-043.

### Clear conversation history (added 2026-10-07)

- **Question:** Does "Clear conversation" clear the room for everyone or only this tab, and does it ask first?
- **Decision:** It clears the room for everyone, and every tab is told who cleared it ("Conversation cleared" for the tab that did it, "{name} cleared the conversation" for others), including tabs that were disconnected at the time. No confirmation; a toast follows.
- **Rationale:** The room is shared, so a local-only clear would just come back on reload; telling everyone avoids messages silently disappearing.
- **Caveats:** Sequence numbers keep growing after a clear (never reused), so catch-up stays correct.

## Tentative

None.
