---
id: "007"
feature: file-upload
type: greenfield
scope: complex
status: done
branch: main
created: 2026-10-07
---

# Feature: File Upload with Progress

## Overview

Practice 6 of the playground. The learner wants to build, from scratch, the
client side of a serious file uploader: drop or pick files (or paste them, or
drop a whole folder), see each file checked before anything is sent, watch
real per-file progress with speed and time left, and pause, resume, cancel
or retry any file. Large files go up in pieces, so an interrupted upload
continues from where it stopped instead of starting over.

It's a good exercise because progress bars are easy, but everything around
them is not: only a few files should upload at once, a paused or failed file
must resume without re-sending what the server already has, cancelling must
really stop the network and clean up the server side, and progress has to be
honest when the network is slow or flaky. Uploads hit this repo's own
endpoint, which stores files for the session and lists them back, and a demo
control slows the server down so progress is visible even on localhost.

Cross-practice rules from feature 001 apply (core logic hand-built,
explanation guide + demo controls, data from this repo's own backend: uploads
send real bytes to a real endpoint).

## Goals

- [x] Every accepted file reaches the server intact: the stored file matches the original byte for byte.
- [x] Progress is honest: each file's bar, speed and time left reflect bytes the server has actually received, and never move backwards except when the user restarts a file.
- [x] An interrupted upload (pause, network failure, server error) resumes from the last piece the server confirmed, without re-sending earlier pieces.
- [x] The user stays in control of every file: pause, resume, cancel and retry each one, with at most the chosen number uploading at once.
- [x] Invalid files are explained before any byte is sent, and the learner can trigger every failure mode from the demo controls.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Uploading to a third-party storage service | Feature 001: practices use this repo's own backend |
| Server-side processing (image resizing, virus scanning, format conversion) | The practice is about the upload, not what happens after |
| Editing files before upload (crop, rotate) | Separate problem space |
| Accounts, per-user storage, sharing links | One shared session store is enough for the demo |
| Durable storage | Files are kept for the session and cleaned up; no persistence guarantee |
| Background uploads after the tab is closed | Needs service workers / platform features outside the practice |

## User Stories

### P1: Add files and see them checked

- As a learner, I want to drop or pick files and see each one checked against the rules so that I know immediately which files will upload and why others won't.
- **Why P1:** Entry point of the whole flow; nothing else works without it.
- **Independent Test:** Drop a mix of valid files, an oversized file and a disallowed type: valid ones join the list as ready, the others appear with a clear reason and no request is made for them.

**Acceptance Criteria:**

- [x] AC-001: WHEN the user drops files on the drop zone or picks them with the file picker THEN system SHALL add each file to the list with its name, size and type.
- [x] AC-002: WHEN files are dragged over the drop zone THEN system SHALL show that dropping is possible, and SHALL return to normal when the drag leaves or ends.
- [x] AC-003: WHEN a file breaks a rule (type not allowed, larger than the size limit, empty, or over the file-count limit) THEN system SHALL show it as rejected with the specific reason and SHALL NOT send any of it.
- [x] AC-004: WHEN the drop zone is used with a keyboard THEN system SHALL open the file picker with Enter or Space, and the zone SHALL describe the rules (types, size, count).
- [x] AC-005: WHEN files are added THEN system SHALL announce how many were accepted and rejected to assistive technology.

### P1: Upload with real progress

- As a learner, I want each file to upload with its own progress, speed and time left so that I can see real network behavior.
- **Why P1:** The practice's namesake.
- **Independent Test:** With a slow upload speed, add three files: each shows a growing bar with percentage, speed and time left; when done, each appears in the uploaded files list with a verified match.

**Acceptance Criteria:**

- [x] AC-006: WHEN accepted files are added THEN system SHALL start uploading them automatically, up to the concurrency limit, in the order they were added.
- [x] AC-007: WHEN a file is uploading THEN system SHALL show its progress as a percentage of bytes the server has received, plus current speed and estimated time left.
- [x] AC-008: WHEN a file finishes THEN system SHALL confirm that the server's copy matches the original and mark it done; WHEN it doesn't match THEN system SHALL mark it failed with a clear reason.
- [x] AC-009: WHEN several files are uploading THEN system SHALL show overall progress across all of them (bytes done of bytes total, files done of files total).
- [x] AC-010: WHEN progress changes THEN system SHALL expose it to assistive technology as a progress bar with its value, without announcing every change.

### P1: Pieces and resume

- As a learner, I want large files sent in pieces so that a failure only costs the piece in flight, not the whole file.
- **Why P1:** Chosen transport; it is what makes pause, retry and resume cheap.
- **Independent Test:** Start a large file, force a failure halfway, retry: the server reports how much it already has and the upload continues from there; the network panel shows earlier pieces were not sent again.

**Acceptance Criteria:**

- [x] AC-011: WHEN a file is uploaded THEN system SHALL send it in fixed-size pieces, each confirmed by the server before the next counts as done.
- [x] AC-012: WHEN an upload resumes (after pause, failure or retry) THEN system SHALL ask the server how much it has and continue from there, never re-sending confirmed pieces.
- [x] AC-013: WHEN a piece fails with a temporary error THEN system SHALL retry that piece automatically a few times with growing delays before marking the file failed.
- [x] AC-014: WHEN the server rejects a file permanently (e.g. it no longer knows the upload) THEN system SHALL mark the file failed with the reason and offer to start it over.

### P1: Control each file

- As a learner, I want to pause, resume, cancel and retry each file so that I stay in control of what is uploading.
- **Why P1:** Named in the practice summary (cancel and retry); pause/resume was selected.
- **Independent Test:** Pause one of three uploading files: its network activity stops and a queued file takes its slot; resume it and it continues from where it stopped; cancel another and it disappears from the server.

**Acceptance Criteria:**

- [x] AC-015: WHEN the user pauses a file THEN system SHALL stop its network activity immediately, keep its progress, and give its slot to the next queued file.
- [x] AC-016: WHEN the user resumes a paused file THEN system SHALL queue it and continue from the server's confirmed amount when a slot is free.
- [x] AC-017: WHEN the user cancels a file THEN system SHALL stop its network activity, tell the server to discard what it received, and remove it from the active list.
- [x] AC-018: WHEN the user retries a failed file THEN system SHALL resume it from the server's confirmed amount (or start over if the server no longer has it).
- [x] AC-019: WHEN the user uses "Pause all", "Resume all", "Cancel all" or "Clear finished" THEN system SHALL apply the action to every file it concerns.

### P2: Concurrency queue

- As a learner, I want to choose how many files upload at once so that I can see how a queue shares the connection.
- **Why P2:** Selected extra; uploads work with the default.

**Acceptance Criteria:**

- [x] AC-020: WHEN more files are waiting than the concurrency limit allows THEN system SHALL show them as queued, with their place in line.
- [x] AC-021: WHEN the concurrency limit changes THEN system SHALL start queued files if it grew, and SHALL let running files finish their current piece and then wait if it shrank.

### P2: Image previews

- As a learner, I want to see thumbnails of images so that I can recognize them in the list.
- **Why P2:** Selected extra; not needed for uploading.

**Acceptance Criteria:**

- [x] AC-022: WHEN an image file is added THEN system SHALL show a small thumbnail generated in the browser, without uploading anything first.
- [x] AC-023: WHEN a file is removed from the list THEN system SHALL release the memory its preview used.

### P2: Paste and folder drop

- As a learner, I want to paste files from the clipboard and drop whole folders so that adding many files is quick.
- **Why P2:** Selected extra.

**Acceptance Criteria:**

- [x] AC-024: WHEN the user pastes files (e.g. a screenshot) while the practice has focus THEN system SHALL add them like dropped files.
- [x] AC-025: WHEN the user drops a folder THEN system SHALL add every file inside it, including subfolders, showing each file's path within the folder.

### P2: Uploaded files on the server

- As a learner, I want to see what the server stored so that I can trust the upload worked.
- **Why P2:** Selected storage option; proves end-to-end integrity.

**Acceptance Criteria:**

- [x] AC-026: WHEN files finish uploading THEN system SHALL list them under "Uploaded files" with name, size, upload time and a verified-match indicator, newest first.
- [x] AC-027: WHEN the user deletes an uploaded file THEN system SHALL remove it from the server and the list.
- [x] AC-028: WHEN the server starts or a session's storage limit is reached THEN system SHALL remove old session files so storage stays bounded, and the list SHALL reflect it.

### P2: Demo controls

- As a learner, I want controls that change the network and the rules so that I can trigger every path.
- **Why P2:** The playground rule (feature 001) is that every behavior is reachable from the demo.

**Acceptance Criteria:**

- [x] AC-029: WHEN the learner changes the upload speed THEN the server SHALL receive data no faster than that speed for subsequent pieces, and progress SHALL slow accordingly.
- [x] AC-030: WHEN the learner changes the piece failure rate THEN the server SHALL fail that share of pieces with a temporary error.
- [x] AC-031: WHEN the learner changes the concurrency limit, piece size, size limit, allowed types or file-count limit THEN system SHALL apply the new values to files added or pieces sent afterwards.
- [x] AC-032: WHEN the learner presses "Add sample files" THEN system SHALL generate a few files in the browser (including one image and one large file) and add them as if dropped.

### P3: Resume after reload

- As a learner, I want an upload interrupted by a reload to continue when I add the same file again so that a closed tab doesn't waste what was sent.
- **Why P3:** Polish on top of resume; browsers can't keep file access across a reload, so the user must re-add the file.

**Acceptance Criteria:**

- [x] AC-033: WHEN the page is reloaded with uploads unfinished THEN system SHALL list them as "interrupted" with their progress and ask the user to add the same files again.
- [x] AC-034: WHEN the user adds a file that matches an interrupted upload THEN system SHALL resume it from the server's confirmed amount instead of starting over.

## Edge Cases

- WHEN the same file is added twice while the first copy is still in the list THEN system SHALL treat it as a duplicate and say so instead of uploading it again.
- WHEN a file is changed on disk while uploading THEN system SHALL detect the mismatch when it finishes and mark it failed rather than store a corrupted file.
- WHEN the browser goes offline during uploads THEN system SHALL pause the affected pieces, show the files as waiting for the network, and continue on its own when back online.
- WHEN the user leaves the practice with uploads running THEN system SHALL keep them running in the background of the playground and show them again on return (pausing only happens on request or reload).
- WHEN a file name contains unusual characters, very long text or a path THEN system SHALL display it safely (truncated with the full name available) and store it under a safe name on the server.
- WHEN a zero-byte file or a file with no type is added THEN system SHALL apply the rules (empty files rejected; type checked by extension when the browser gives none).
- WHEN 100 files are dropped at once THEN the page SHALL stay responsive and only the concurrency limit SHALL be uploading.
- WHEN a piece times out with no response THEN system SHALL treat it as a temporary failure (retry rules apply).
- WHEN the size limit or allowed types change after files were rejected THEN system SHALL not re-check those files automatically; the user re-adds them.

## Success Criteria

- [x] 10 files of mixed sizes (up to 50 MB) upload with checksums matching the originals in 10 out of 10 runs.
- [x] With a 50% piece failure rate, a 20 MB file still completes and matches, and the server receives each confirmed piece exactly once.
- [x] Pausing and resuming a file 5 times re-sends at most one piece's worth of data per pause.
- [x] At a 256 KB/s upload speed, the shown speed is within 20% of 256 KB/s after the first few seconds, and the time left is within 20% of the actual remaining time at the halfway point.
- [x] Dropping 100 small files keeps the page responsive (no long task over 100 ms) and never runs more uploads than the concurrency limit.
- [x] Zero serious or critical issues in an automated accessibility audit, in light and dark themes.

## Open Questions

- None. Decisions are recorded in [decisions.md](decisions.md).

## Notes

- The explanation guide should cover: drag-and-drop and the hidden file input (and why the drop zone must also work by keyboard), validating on the client and again on the server, chunked uploads with an upload id and server-confirmed offset, why progress counts confirmed bytes, a concurrency-limited queue, aborting requests on pause/cancel, retry with backoff per piece, integrity checks with a checksum, object URLs for previews and releasing them, and reading folders from a drop.
- Raises toasts through the playground's notification system for batch results (e.g. "8 files uploaded, 1 failed"), not a second notification mechanism.
- Must be usable at phone width.
- Defaults (types, limits, piece size, concurrency, storage bound) are recorded in [decisions.md](decisions.md).
