---
id: 035
feature: friend-challenge
type: brownfield
scope: large
status: to-review
branch: main
created: 2026-11-09
---

# Feature: Challenge a friend from the waiting room

## Overview

A host waiting in an Arena room can only bring someone in by sharing the code, the link or the QR code outside the app. Friends who are online right now (feature 031) are one tap away in every other part of the app, but not here. The host should be able to challenge an online friend directly, and the friend should be able to say yes or no from wherever they are in the app.

## Goals

- [ ] A host can bring an online friend into the room in two taps (Thách đấu, then the friend's Chấp nhận), with no code shared outside the app
- [ ] The host always learns how a challenge ended: accepted, declined, busy in another room, gone offline, or no answer within 30 seconds

## Out of Scope

| Feature | Reason |
|---------|--------|
| Challenging from the friends page or the sidebar | The request is for the waiting room; a room must exist first |
| Keeping missed challenges in the bell | Chosen during discussion: a toast only (decisions.md) |
| Replacing the one-minute presence pulse with the new connection | Separate change; online dots keep working as today |
| Challenges for guests | The Arena already needs a Google sign-in |

## User Stories

### P1: Challenge an online friend

- As a host waiting for an opponent, I want to challenge an online friend from the room so that I don't have to send them the code
- **Why P1:** it is the feature
- **Independent Test:** with two signed-in friends in two browsers, the host taps Thách đấu, the friend taps Chấp nhận and lands in the room as the second player

**Acceptance Criteria:**

- [x] AC-001: WHEN the host is in the waiting room with a free seat THEN system SHALL show a "Thách đấu bạn bè" list of their friends below the players, online friends first, each with their online state
- [x] AC-002: WHEN a friend in that list is online and not already in this room THEN system SHALL show a "Thách đấu" button next to their name; offline friends SHALL have no button
- [x] AC-003: WHEN the host taps "Thách đấu" THEN system SHALL deliver the challenge to every open tab of that friend at once, and the host's row SHALL show "Đang chờ" with the seconds left and a "Hủy" button
- [x] AC-004: WHEN a challenge reaches the friend THEN system SHALL show a toast on whatever page they are on, lessons and reviews included, naming the host and the room settings, with "Chấp nhận" and "Từ chối" buttons and the seconds left
- [x] AC-005: WHEN the friend taps "Chấp nhận" THEN system SHALL open the room the same way as joining by its code, and tell the host the friend accepted
- [x] AC-006: WHEN the friend taps "Từ chối" THEN system SHALL close the toast and tell the host the friend declined

### P1: Busy, gone and unanswered challenges

- As a host, I want to know when a challenge can't go through so that I can pick someone else
- **Why P1:** the request lists these outcomes explicitly
- **Independent Test:** challenge a friend who has another room open; the host is told at once

**Acceptance Criteria:**

- [x] AC-007: WHEN the friend has another Arena room open (waiting, playing or watching) THEN system SHALL not deliver the challenge and SHALL tell the host the friend is in another room
- [x] AC-008: WHEN the friend has no tab of the app open any more THEN system SHALL tell the host the friend has just gone offline
- [x] AC-009: WHEN 30 seconds pass with no answer THEN system SHALL close the friend's toast and tell the host the friend didn't answer; the host can challenge again
- [x] AC-010: WHEN the host taps "Hủy", leaves the room, or the seat is taken THEN system SHALL close the friend's toast

### P2: Several tabs

- As a learner with the app open in several tabs, I want one answer to count everywhere

**Acceptance Criteria:**

- [x] AC-011: WHEN the friend answers in one tab THEN system SHALL close the toast in their other tabs

## Edge Cases

- WHEN the friend accepts but the room has filled, started or closed meanwhile THEN system SHALL show the room page's usual message (full rooms take them as a spectator, as joining by code does)
- WHEN the host challenges someone who is not their friend, or a room they don't host or that is no longer waiting THEN system SHALL refuse with a Vietnamese message and deliver nothing
- WHEN the friend's connection drops THEN system SHALL reconnect it on its own; a challenge sent while they have no connection counts as offline
- WHEN the host challenges the same friend again while one is pending THEN system SHALL keep a single pending challenge per friend
- WHEN the host sends challenges too quickly THEN system SHALL answer with the Arena's usual "too fast" message

## Success Criteria

- [ ] A challenge reaches the friend's screen within 2 seconds of the tap
- [ ] Every challenge ends in exactly one message to the host

## Open Questions

- None

## Notes

Requested by the owner on 2026-11-09 with the waiting-room screenshot. Choices from discussion: toast with buttons, shown even in focus screens, 30 seconds (decisions.md).

## Baseline

### Current Behavior

- The waiting room shows the code, copy buttons, a QR code and the players. The empty seat says to send the code or link to friends.
- Friends and their online dots appear in the sidebar and on the friends page, refreshed once a minute.

### Gaps / Limitations

- No way to invite a friend from inside the app; nothing can reach a learner on another page in real time.
