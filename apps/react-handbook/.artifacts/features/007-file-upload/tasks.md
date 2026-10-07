---
id: "007"
feature: file-upload
created: 2026-10-07
---

# Tasks: File Upload with Progress

## Summary

Total: 13 | Completed: 13 | Remaining: 0

## Execution Plan

```
T001 (throttle spike) --> T002 --> T003 --> T004 --┐
                                                   ├--> T007 --> T008 --> T009 --┐
T005 (rules) ------------┐                         │                             ├--> T011 --> T012 --> T013
T006 (collect + samples) ┴-------------------------┘            T010 (UI) -------┘
```

- T005 and T006 (pure client helpers) can run in parallel with the backend group.
- T010 (UI components) can start once T007 defines the engine's item shape.

## Quality Gates

Run after each task or batch:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build` (end of each group)
- No test runner: each "Done when" is checked with `curl`, a scratch Node script, or headless Chrome (single tab) against `pnpm start -p 3456`

## Tasks

### Upload backend

- [x] T001 [P] Spike: a throwaway route that reads `request.body` slowly; measure from a Node client whether the sender is slowed (backpressure) or the body is buffered first
  - **Done when:** result recorded in Verification Notes and design.md Open Questions resolved; spike route deleted. -- VERIFIED

- [x] T002 [B:T001] Create schemas (create body, piece query, complete body, settings, kinds table) and the server upload store on `globalThis`: temp dir emptied on first load, create / find by fingerprint, throttled append at offset with failure injection, complete with SHA-256, delete, list, 200 MB bound
  - **Done when:** typecheck passes; a scratch run shows create → append pieces → complete with matching hash, a wrong offset is refused with the server offset, a failed piece appends nothing. -- VERIFIED

- [x] T003 [B:T002] Add route handlers: `POST /uploads`, `GET|PUT|DELETE /uploads/[id]`, `POST /uploads/[id]/complete`, `GET /files`, `GET|PUT /settings`
  - **Done when:** curl shows 201 then 200 (resume) for the same fingerprint, 422 for a disallowed type / oversized / empty file, 409 with offset on a wrong offset, 503 at failRate 1 with offset unchanged, 413 for an oversized piece, 404 after delete, checksum mismatch → 422 and removed, throttle at 256 KB/s takes ≈ 4 s per MB, `/files` lists newest first with usage. -- VERIFIED

- [x] T004 [B:T003] Enforce the storage bound end to end and clean up partial uploads
  - **Done when:** uploading past 200 MB removes the oldest stored files first; `/files` usage stays ≤ 200 MB; a removed paused upload answers 404. -- VERIFIED

### Client engine

- [x] T005 [P] Rules: kind detection by MIME with extension fallback, validation (type, size, empty, count), fingerprint
  - **Done when:** a scratch run classifies `.png` / `image/png`, `.csv` with empty type, `.exe`, a 0-byte file and a 60 MB file correctly with the right reasons. -- VERIFIED

- [x] T006 [P] Collect files from drop (including nested folders via entries, all `readEntries` batches), paste and picker; generate sample files (PNG, CSV, JSON, 20 MB zip, empty file, .exe)
  - **Done when:** in the browser, a synthetic drop of a folder tree yields every file with its path; paste yields the clipboard files; "sample files" produce the 6 files with the right sizes and types. -- VERIFIED

- [x] T007 [B:T003,T005] Engine core: module-level store with `useUploads()`, add (validate, dedupe, preview), scheduler with concurrency, per-file loop (create → pieces via XHR with progress → complete), confirmed vs in-flight bytes, speed/ETA smoothing, checksum, done/failed states
  - **Done when:** in a debug view, 3 files upload with at most N concurrent, progress grows to 100%, checksums match, and the server lists them. -- VERIFIED

- [x] T008 [B:T007] Engine control and recovery: pause / resume / cancel / retry per file and in bulk, concurrency shrink/grow, per-piece retry with backoff, 409 resync, permanent failures, offline waiting
  - **Done when:** pause stops network activity and frees the slot; resume continues from the server offset; cancel deletes server-side; at 50% piece failure a file still completes; offline → waiting, online → continues. -- VERIFIED

- [x] T009 [B:T008] Interrupted records across reloads, announcements, batch toast, preview cleanup
  - **Done when:** reload mid-upload shows "Interrupted"; re-adding the same file resumes from the server offset; status region announces add/finish summaries; a toast reports the batch result; removing an image releases its preview. -- VERIFIED

### UI and practice page

- [x] T010 [B:T007] Drop zone (drag states, keyboard picker, rules text, paste), file row (preview/icon, status chip, two-tone progressbar, speed/ETA, actions), upload list (overall progress, bulk actions, interrupted section), stored files (list, delete, usage)
  - **Done when:** all states render in light and dark with readable contrast; the drop zone works by keyboard; progress bars expose role and value; no horizontal scroll at 360 px. -- VERIFIED

- [x] T011 [B:T009,T010,T006] Demo (controls: Upload speed, Piece failure, Concurrency, Piece size, Max file size, Allowed types, Max files, Add sample files) and stage; guide in the quick-002 format; practice route; `built: true`
  - **Done when:** `/practices/file-upload` renders through its own route, shows Built (6 of 14) -- sidebar reads “6 of 14 built”, and every control works from the UI. -- VERIFIED

### Verification

- [x] T012 [B:T011] Verify all ACs and edge cases in a production build
  - **Done when:** each AC has observed evidence recorded here and is marked `[x]` in spec.md. -- VERIFIED

- [x] T013 [B:T012] Measure the success criteria: 10 mixed files ≤ 50 MB checksums 10/10; 20 MB at 50% piece failure completes with each piece stored once; 5 pauses re-send ≤ 1 piece each; speed/ETA within 20% at 256 KB/s; 100 small files responsive and ≤ concurrency running; axe light + dark
  - **Done when:** measurements are recorded here, ready for audit. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001, AC-002, AC-004 | T010 |
| AC-003 | T002, T005, T007 |
| AC-005 | T009, T010 |
| AC-006, AC-007, AC-008 | T007, T010 |
| AC-009, AC-010 | T010 |
| AC-011, AC-012 | T002, T003, T007 |
| AC-013, AC-014 | T008 |
| AC-015–AC-019 | T008, T010 |
| AC-020, AC-021 | T008, T010 |
| AC-022, AC-023 | T007, T009, T010 |
| AC-024, AC-025 | T006, T010 |
| AC-026, AC-027 | T003, T010 |
| AC-028 | T004 |
| AC-029, AC-030 | T001, T002, T003, T011 |
| AC-031, AC-032 | T005, T006, T011 |
| AC-033, AC-034 | T009 |
| Edge cases | T005, T007, T008, T010, T012 |
| Success criteria | T013 |

## Verification Notes (production build, `pnpm start -p 3456`)

| Check | Result |
|-------|--------|
| T001 backpressure spike | Route read 8 MB in 64 KB chunks with a 50 ms pause each. Node client writes: 1 MB @10 ms, 2 MB @14 ms (socket buffers), then 3 MB @992 ms … 8 MB @5142 ms (paced by the server); server finished at 6617 ms. Bodies stream with backpressure; the first ~2 MB look instantly "sent". Design: speed/ETA from confirmed bytes. Spike route deleted |
| API (curl) | create 201 → same fingerprint 200 (resume); 422 for `.exe`, empty, 60 MB; `.csv` with no MIME accepted by extension; piece at a wrong offset → 409 with the server offset; failRate 1 → 503 and offset unchanged; 6 MB piece → 413; complete before all bytes → 409; complete → stored copy's SHA-256 equals the original; wrong checksum → 422 and the upload is gone (404); DELETE → 204 then 404; 1 MB at 256 KB/s → 4.02 s |
| Storage bound | 45 × 5 MB uploads: 40 kept, 200.0 MB used, oldest (and the 3 MB file before them) removed first; `/files` newest first |
| Bug found: wipe on build | `next build` imports route modules in worker processes; the store emptied the temp directory at import, so a build wiped a running server's files. Fixed: reset on the first request, never on import (one reset logged per server process) |
| Happy path (UI) | “Add sample files”: PNG, CSV, JSON and a 20 MB zip upload and verify; `empty.txt` and `setup.exe` “Not added” with reasons; 996 KB/s shown at the 1 MB/s throttle; “Uploaded files on the server” lists 4 with “Checksum matches” |
| Concurrency | 6 × 2 MB at 256 KB/s: max 3 uploading, “Queued #1–#3”; pause gives the slot to the next file; resume re-queues; cancel removes the row and the server copy (no `.part` left); “At once” 1 → running files finish their piece then wait (one left after 3.3 s); back to 3 → 3 uploading |
| Bug found: pause re-sent 2 pieces | after a pause the server was still finishing the abandoned piece and refused the new one (503), so the client resent again. Fixed: a newer piece request supersedes an abandoned one and the server stops reading when the client disconnects |
| SC3 pause/resume | 10 MB at 1 MB/s, paused 5 times: 15 requests = 10 confirmed + 5 abandoned (one per pause), progress advanced every time (20 → 30 → 40 → 50 → 60%), verified |
| SC2 50% piece failure | 20 MB: first run with 10 tries failed (one piece failed 10 times in a row, ≈ 2% chance); curl confirmed the server's draw is independent (19/40 ok). Raised to 12 tries; rerun: 46 requests, 26 failed (56%), 20 pieces each confirmed once, max try 7, verified (a double append would have broken the checksum). The harness had been installed twice, so its raw log showed every request twice |
| SC4 speed/ETA | 4 MB at 256 KB/s: 16.3 s total; shown speed 254 KB/s after 3 s; at 50% (8.3 s) shown 8 s left, actual 8.0 s |
| Offline | `offline` → both files “Waiting for the network”, no progress for 1.5 s, overall line says offline; `online` → uploading again, both verified |
| Folder / paste / rules | fake entry tree with nested folder and batched `readEntries`: 5 files added with paths (`photos/2026/b.png` …), all verified; pasted PNG verified; same File dropped twice → “Not added: already in the list”; Max files 5 with 8 dropped → 3 uploading, 2 queued, 3 “Over the 5-file limit”; corrupted browser hash → “Failed: Checksum mismatch …”, not stored |
| SC5 100 files | 100 small files: 50 accepted (largest limit offered), 50 over the limit; max 3 uploading; 0 long tasks; worst frame 19 ms |
| Previews | removing an image row revokes its object URL; an image that can't be decoded falls back to the type icon (found in a screenshot, fixed) |
| Leave and return | navigated to Toast at 12%, back after 3 s at 62%, still uploading, then verified |
| Reload (AC-033/034) | reload at 16%: row “Interrupted …” with 16% kept; adding the same file → resumed from 1 MB (5 pieces sent, not 6), verified, one row, record cleared |
| SC1 | 10 files (50, 30, 20, 10, 5, 2, 1, 0.5, 0.1, 0.01 MB): 10/10 “Uploaded and verified”, and each server SHA-256 equals an independent hash of the original |
| Drop zone | dragenter → “Release to add files” + highlight, kept while over a child, cleared after the last dragleave; “Choose files” / “Choose a folder” open the pickers, described by the rules line |
| axe-core 4.10.2 | light + dark with uploading, queued, rejected, done and preview rows and the guide open: 0 serious, 0 critical; 1 moderate `region` (pre-existing) |
| 360 px | page width 360; row buttons ≥ 44 px; a very long file name truncates |

Verified by code inspection only: 60 s piece timeout (`xhr.timeout`, treated as temporary), unusual file names (stored under generated ids, shown as text), piece size changes applying to the next piece, rules changes not re-checking files already rejected.
