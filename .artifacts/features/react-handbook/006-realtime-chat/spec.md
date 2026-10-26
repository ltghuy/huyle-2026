---
id: "006"
feature: realtime-chat
type: greenfield
scope: complex
status: done
branch: main
created: 2026-10-07
---

# Feature: Real-Time Chat UI

## Overview

Practice 5 of the playground. The learner wants to build, from scratch, the
client side of a live chat room: messages pushed from the server appear as
they happen, the user's own messages show instantly before the server
confirms them, and the view stays pinned to the newest message only when
the user is actually reading the bottom. A chat is a good exercise because
the hard parts are invisible in the happy path: the connection drops and
must recover without losing or duplicating messages, the user's optimistic
message and the server's echo of it must merge into one, older history
loads above the reader without making the view jump, and auto-scroll must
never yank the user away from something they scrolled up to read.

The demo is one shared room. Simulated participants talk on their own and
reply to the user, and every open browser tab joins the same room as a real
participant, so cross-client delivery can be watched with two tabs side by
side. Cross-practice rules from feature 001 apply (core logic hand-built,
explanation panel + demo controls, data from this repo's own mock backend:
a one-way server push stream for receiving, normal requests for sending).

## Goals

- [x] Every message sent by anyone in the room appears in every connected tab exactly once, in the same order.
- [x] The user's own messages appear instantly, and a failed send is clearly marked and can be retried or discarded without losing the text.
- [x] A dropped connection recovers on its own and fills in every message missed while offline, with no duplicates.
- [x] The view follows new messages only while the user is at the bottom; reading older messages is never interrupted by auto-scroll or by history loading above.
- [x] The learner can trigger every failure mode (latency, failed sends, dropped connection, bursts) from the demo controls and see the client handle it.

## Out of Scope

| Feature | Reason |
|---------|--------|
| More than one room / direct messages | Keeps the practice focused on the stream, ordering and scrolling |
| Editing or deleting messages, reactions, threads | Extra message mutations add little beyond the optimistic-send pattern |
| Attachments and images | Covered by the file upload practice |
| Accounts, sign-in, real identity | A display name per browser is enough for the demo |
| Rich text / markdown rendering | Messages are plain text; the practice is about delivery, not formatting |
| Durable server history | The room lives in server memory and resets on restart; the demo doesn't need persistence |
| Push notifications / sounds | Outside the browser tab, not part of the pattern |

## User Stories

### P1: Live message stream

- As a learner, I want messages from other participants to appear as soon as they're sent so that I can see a live connection at work.
- **Why P1:** Receiving pushed messages is the core of a real-time chat.
- **Independent Test:** Open the practice; simulated participants' messages appear without any user action, and a message sent in a second tab appears in the first within a second.

**Acceptance Criteria:**

- [x] AC-001: WHEN the practice opens THEN system SHALL show the most recent page of room history and then connect to the live stream.
- [x] AC-002: WHEN any participant (simulated or another tab) sends a message THEN system SHALL show it in every connected tab within one second of the server accepting it, under zero added latency.
- [x] AC-003: WHEN messages arrive THEN system SHALL display them in the server's order, each with author name, text, and send time.
- [x] AC-004: WHEN the same message is delivered more than once (history overlap, reconnect replay) THEN system SHALL show it only once.
- [x] AC-005: WHEN consecutive messages come from the same author within a short time THEN system SHALL group them under one author header.
- [x] AC-006: WHEN messages from different days are shown THEN system SHALL insert a day separator between them.

### P1: Optimistic send

- As a learner, I want my message to appear the moment I press send so that the chat feels instant even on a slow network.
- **Why P1:** Optimistic sends are named in the practice summary and are the main client-side pattern.
- **Independent Test:** With high latency, send a message: it appears immediately as "sending", then turns into a normal message once confirmed, without moving or duplicating.

**Acceptance Criteria:**

- [x] AC-007: WHEN the user sends a non-empty message THEN system SHALL show it at the bottom immediately, marked as sending, and clear the input.
- [x] AC-008: WHEN the server confirms the message THEN system SHALL replace the pending message with the confirmed one in place, with no duplicate even if the live stream delivers it before the confirmation.
- [x] AC-009: WHEN a send fails THEN system SHALL keep the message in the list marked as failed with Retry and Discard actions, and SHALL NOT lose its text.
- [x] AC-010: WHEN the user retries a failed message THEN system SHALL send it again as the same message, so a send that actually reached the server is never shown twice.
- [x] AC-011: WHEN the user sends several messages quickly THEN system SHALL keep them in the order they were typed, both while pending and after confirmation.
- [x] AC-012: WHEN the user presses Enter THEN system SHALL send; WHEN the user presses Shift+Enter THEN system SHALL insert a new line.
- [x] AC-043: WHEN the user reloads or leaves with messages still sending or failed THEN system SHALL show them again on return in that browser: still-sending ones re-sent, failed ones retryable, never duplicated if the server already has them.

### P1: Smart auto-scroll

- As a learner, I want the view to follow new messages only when I'm at the bottom so that reading older messages is never interrupted.
- **Why P1:** Auto-scroll is named in the practice summary and is the most visible UX behavior.
- **Independent Test:** At the bottom, new messages keep the view pinned; after scrolling up, new messages arrive without moving the view.

**Acceptance Criteria:**

- [x] AC-013: WHEN the user is at (or within a small distance of) the bottom and a message arrives THEN system SHALL keep the newest message fully visible.
- [x] AC-014: WHEN the user has scrolled up and a message from someone else arrives THEN system SHALL NOT move the view.
- [x] AC-015: WHEN the user sends a message THEN system SHALL scroll to the bottom regardless of the current position.
- [x] AC-016: WHEN content above or inside the visible messages changes size (a pending message confirmed, a failed marker added) THEN system SHALL keep the view pinned if it was at the bottom.

### P1: Reconnect and catch-up

- As a learner, I want the chat to recover from a dropped connection on its own so that I never silently miss messages.
- **Why P1:** Live connections drop; recovering correctly is what separates a real chat from a demo.
- **Independent Test:** Drop the connection from the demo controls while others keep talking; the status shows reconnecting, and after reconnect every missed message appears once, in order.

**Acceptance Criteria:**

- [x] AC-017: WHEN the connection state changes THEN system SHALL show it (connecting, live, reconnecting, offline) in a visible status indicator that is also announced to assistive technology.
- [x] AC-018: WHEN the connection drops THEN system SHALL retry automatically with growing, randomized delays up to a cap.
- [x] AC-019: WHEN the connection is restored THEN system SHALL deliver every message sent while disconnected, in order, with no duplicates and no gaps.
- [x] AC-020: WHEN the browser goes offline THEN system SHALL stop retrying and SHALL reconnect immediately when it comes back online.
- [x] AC-021: WHEN the user sends a message while disconnected THEN system SHALL still attempt the send and handle success or failure as in AC-008/AC-009.

### P2: Older history upward

- As a learner, I want earlier messages to load as I scroll to the top so that I can read back without the view jumping.
- **Why P2:** Reverse pagination with scroll anchoring is a distinct, hard technique, but the chat works without it.

**Acceptance Criteria:**

- [x] AC-022: WHEN the user scrolls near the top and older messages exist THEN system SHALL load the previous page and show a loading indicator at the top.
- [x] AC-023: WHEN an older page is inserted above THEN system SHALL keep the message the user was reading at the same position on screen.
- [x] AC-024: WHEN the start of the room's history is reached THEN system SHALL show a "beginning of conversation" marker and stop requesting.
- [x] AC-025: WHEN loading older messages fails THEN system SHALL show an inline error with Retry at the top and keep the loaded messages.
- [x] AC-026: WHEN an older page is already loading THEN system SHALL NOT start another request for it.

### P2: Unread jump and read state

- As a learner, I want to see how many messages arrived while I was scrolled up and jump to them so that I know what I missed.
- **Why P2:** Completes the auto-scroll story for readers who scrolled away.

**Acceptance Criteria:**

- [x] AC-027: WHEN messages arrive while the user is scrolled up THEN system SHALL show a "N new messages" button that jumps to the first unread message when pressed.
- [x] AC-028: WHEN the user scrolls back to the bottom THEN system SHALL clear the new-messages button.
- [x] AC-029: WHEN unread messages exist THEN system SHALL show an unread divider above the first one, kept until the user sends a message or reloads.
- [x] AC-030: WHEN the tab is hidden and messages arrive THEN system SHALL count them as unread and show the count in the tab title until the tab is visible again.
- [x] AC-031: WHEN the user's own message is confirmed THEN system SHALL mark it as delivered; WHEN any other participant (simulated or another tab with the message in view while visible) has seen it THEN system SHALL mark it as seen.

### P2: Typing indicators

- As a learner, I want to see when someone is typing so that the room feels alive.
- **Why P2:** A second kind of live event on the same stream; not needed for messaging.

**Acceptance Criteria:**

- [x] AC-032: WHEN another participant is typing THEN system SHALL show "{name} is typing…" (or "Several people are typing…" for three or more) below the messages.
- [x] AC-033: WHEN a participant stops typing, sends, or leaves THEN system SHALL remove their indicator, and an indicator SHALL expire on its own after a few seconds without updates.
- [x] AC-034: WHEN the user types THEN system SHALL tell the room at most once every few seconds, not on every keystroke.

### P2: Identity

- As a learner, I want a display name I can change so that I can tell my tabs apart.
- **Why P2:** Needed to make multi-tab demos readable.

**Acceptance Criteria:**

- [x] AC-035: WHEN a tab opens the practice for the first time THEN system SHALL give it a random display name, remembered in that browser.
- [x] AC-036: WHEN the user changes their display name THEN system SHALL use it for messages sent afterwards; earlier messages keep the name they were sent with.
- [x] AC-037: WHEN a display name is empty or longer than 32 characters THEN system SHALL reject it with an inline message.

### P2: Demo controls

- As a learner, I want controls to inject failures so that I can watch each recovery path.
- **Why P2:** The playground rule (feature 001) is that every behavior is reachable from the demo.

**Acceptance Criteria:**

- [x] AC-038: WHEN the learner changes latency or send failure rate THEN system SHALL apply it to subsequent sends and history loads.
- [x] AC-039: WHEN the learner presses "Drop connection" THEN system SHALL close the live connection from the server side so the client's recovery path runs.
- [x] AC-040: WHEN the learner changes simulated participant activity (off, normal, burst) THEN the room SHALL change how often simulated participants post; burst SHALL send many messages within a few seconds.
- [x] AC-041: WHEN the learner presses "Go offline" THEN system SHALL behave as if the browser lost the network until pressed again.

### P2: Clear conversation history

- As a learner, I want to clear the room's history from the demo controls so that I can start a scenario from an empty conversation, and everyone in the room knows who cleared it.
- **Why P2:** A demo convenience that also exercises a room-wide event every client must apply, including clients that were disconnected when it happened.

**Acceptance Criteria:**

- [x] AC-044: WHEN the learner presses "Clear conversation" THEN system SHALL delete the room's messages for every participant immediately, without asking for confirmation.
- [x] AC-045: WHEN the conversation is cleared THEN every connected tab SHALL empty its message list, show "Conversation cleared by {name}" at the top, and raise a notification: "Conversation cleared" for the tab that cleared it, "{name} cleared the conversation" for everyone else.
- [x] AC-046: WHEN a tab was disconnected while the conversation was cleared THEN on reconnect system SHALL apply the clear and raise the same notification before showing newer messages.
- [x] AC-047: WHEN the conversation is cleared THEN messages still sending or failed in a tab SHALL stay in that tab (they were never part of the history), and new messages SHALL keep their order and catch-up behavior.

### P3: Simulated participants reply

- As a learner, I want simulated participants to occasionally answer me so that sending feels like a conversation.
- **Why P3:** Polish; the stream already proves delivery.

**Acceptance Criteria:**

- [x] AC-042: WHEN the user sends a message and activity is not off THEN a simulated participant SHALL sometimes show typing and reply within a few seconds.

## Edge Cases

- WHEN the user sends only whitespace THEN system SHALL not send and SHALL keep the send button disabled.
- WHEN a message exceeds 2000 characters THEN system SHALL block sending and show the remaining-character count turning into an error.
- WHEN a message contains markup or script-like text THEN system SHALL display it as plain text.
- WHEN a very long word or URL is sent THEN system SHALL wrap it without horizontal scrolling.
- WHEN a confirmation arrives for a pending message the user already discarded THEN system SHALL show the confirmed message (the server accepted it) rather than lose it.
- WHEN the live stream delivers a message older than the newest one shown (out-of-order) THEN system SHALL place it in server order.
- WHEN reconnect replay would be larger than the server keeps THEN system SHALL reload the latest history page and mark that earlier messages may be missing above.
- WHEN an older page loads while new messages are also arriving THEN system SHALL keep both the reader's anchor and the order correct.
- WHEN the user leaves the practice THEN system SHALL close the connection and stop all timers; returning SHALL reconnect and catch up.
- WHEN two tabs use the same display name THEN system SHALL still treat them as different participants (own messages identified per tab, not per name).
- WHEN a burst sends many messages at once THEN the UI SHALL stay responsive and announce them to assistive technology without flooding (summarized).
- WHEN a pending message is still sending after 15 seconds THEN system SHALL mark it as failed.
- WHEN the conversation is cleared twice in a row, or while a tab is loading older messages THEN each tab SHALL end with an empty history, no stale older page, and one notification per clear.

## Success Criteria

- [x] With two tabs and simulated participants active for 2 minutes, both tabs show the identical message sequence (same ids, same order, no duplicates).
- [x] After 10 forced disconnects of 3–10 seconds while others keep posting, zero messages are missing or duplicated in 10 out of 10 runs.
- [x] An optimistic message is visible within one frame of pressing send at any latency setting.
- [x] Loading 5 older pages while scrolled up moves the anchored message by at most 1 pixel each time.
- [x] While scrolled up, a 50-message burst moves the view by 0 pixels and produces no long task over 50 ms.
- [x] Zero serious or critical issues in an automated accessibility audit, in light and dark themes.

## Open Questions

- None. Decisions are recorded in [decisions.md](decisions.md).

## Notes

- The explanation panel should cover: one-way server push vs. sending with normal requests, message ids and server sequence for ordering and dedupe, client-generated ids that let a confirmation and its echo merge into the optimistic message, resume-from-last-seen on reconnect, reconnect backoff with jitter and online/offline awareness, "stick to bottom" detection, scroll anchoring for prepended history, throttled typing events with expiry, and announcing new messages accessibly without flooding.
- Must be usable at phone width (feature 001 lists chat among practices worth checking narrow).
- Gray-area decisions (participants, seen, unread lifetime, replay window, pending messages across reloads) are in [decisions.md](decisions.md).
- Raises toasts through the playground's notification system where appropriate (e.g., connection lost for a long time), not a second notification mechanism.
