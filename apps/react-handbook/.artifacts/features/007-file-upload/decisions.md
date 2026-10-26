---
id: "007"
feature: file-upload
created: 2026-10-07
---

# Decisions: File Upload with Progress

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### Transport

- **Question:** One request per file, or chunked and resumable?
- **Decision:** Chunked and resumable: files go up in pieces confirmed by the server; a paused, failed or cancelled-then-retried upload continues from the last confirmed piece, also after a reload when the same file is added again.
- **Rationale:** The real-world pattern for large files; makes pause, retry and resume cheap.
- **Caveats:** Resume after reload needs the user to re-add the file (browsers don't keep file access across reloads).

### Extras

- **Question:** Which extras beyond drop, progress, cancel and retry?
- **Decision:** All four: client-side validation, a concurrency queue with pause/resume, image previews, paste and folder drop.
- **Rationale:** Each is a common requirement of production uploaders.
- **Caveats:** Makes the feature Complex scope.

### Storage

- **Question:** Keep uploaded files on the server or discard them?
- **Decision:** Keep them for the session and list them ("Uploaded files") with size, time and a verified checksum match; each can be deleted.
- **Rationale:** Proves end-to-end integrity, which is the point of the practice.
- **Caveats:** Storage must be bounded (see Storage bound).

### Making progress visible

- **Question:** Uploads to localhost finish instantly; how does the demo show progress?
- **Decision:** A server-side throttle set from the demo controls: the server reads the request body no faster than the chosen speed, so the browser's progress is genuinely limited.
- **Rationale:** Real backpressure instead of fake client delays.
- **Caveats:** None.

### Default rules

- **Question:** Allowed types, size limit, file-count limit?
- **Decision:** Images, PDF, text/CSV/JSON and ZIP; 50 MB per file; 20 files at once. All adjustable in the demo controls.
- **Rationale:** Covers realistic uploads while keeping test files manageable.
- **Caveats:** The server re-checks the same rules.

### Piece size and concurrency

- **Question:** Default piece size and concurrency?
- **Decision:** 1 MB pieces (choice of 256 KB – 5 MB); 3 files at once (1–6).
- **Rationale:** Small enough that a failure costs little, large enough to keep request overhead low.
- **Caveats:** None.

### Storage bound

- **Question:** How much does the server keep, and for how long?
- **Decision:** Up to 200 MB in total, oldest removed first; everything cleared on server start.
- **Rationale:** Bounded disk use for a demo with no accounts.
- **Caveats:** A removed upload that was paused can't resume; it is offered to start over (AC-014).

### Paused uploads on the server

- **Question:** Does a paused upload keep its received pieces indefinitely?
- **Decision:** Yes, until it finishes, is cancelled, or is removed by the storage bound.
- **Rationale:** Pause should be free to resume later.
- **Caveats:** None.

### Leaving the practice

- **Question:** Do uploads keep running when the user navigates to another practice?
- **Decision:** Yes, like chat and toast state; they show again on return. Only pause on request or reload.
- **Rationale:** Consistent with the playground's app-wide stores.
- **Caveats:** None.

## Tentative

None.
