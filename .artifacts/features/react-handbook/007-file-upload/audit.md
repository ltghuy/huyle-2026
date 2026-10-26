---
id: "007"
feature: file-upload
audited: 2026-10-07
result: passed
---

# Audit: File Upload with Progress

Evidence from the T012–T013 runs on a production build (`next build && next start`) with curl, Node scripts and headless Chrome, recorded in tasks.md "Verification Notes". Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: Every accepted file stored byte for byte | Met | See SC1; checksum mismatch path deletes the copy (curl and UI) |
| G2: Honest progress, never moving backwards except on restart | Met | Percentage = server-confirmed bytes; failed pieces only clear the in-flight part; speed/ETA from confirmed bytes (SC4) |
| G3: Resume from the last confirmed piece | Met | See SC2 and SC3; resume after reload continued from 1 MB (5 pieces sent, not 6) |
| G4: Control over every file, ≤ concurrency uploading | Met | Pause/resume/cancel/retry per file and in bulk; max 3 uploading with 6 and with 100 files; shrink/grow of the limit |
| G5: Invalid files explained before sending; every failure mode reachable from the controls | Met | Rejections for type, empty, size, count and duplicates before any request; speed, piece failure, limits, offline and sample files all driven from the UI |
| SC1: 10 mixed files ≤ 50 MB, 10/10 checksums | Met | 10/10 verified; each server SHA-256 equals an independent hash of the original |
| SC2: 20 MB at 50% piece failure completes, each piece stored once | Met | 46 requests, 26 failed (56%), 20 pieces each confirmed once, verified (after raising tries to 12; the earlier 10-try run hit the ≈ 2% failure case) |
| SC3: 5 pauses re-send ≤ 1 piece each | Met | 15 requests for 10 pieces: exactly 5 abandoned, one per pause |
| SC4: speed and time left within 20% at 256 KB/s | Met | 254 KB/s shown; at halfway 8 s shown vs 8.0 s actual |
| SC5: 100 small files responsive, ≤ concurrency running | Met | 0 long tasks, worst frame 19 ms, max 3 uploading |
| SC6: 0 serious/critical a11y issues, light + dark | Met | axe-core 4.10.2: 0 serious, 0 critical in both themes; 1 moderate `region` (pre-existing from 001) |

## Known minor issues (not blocking)

- Verified by code inspection only: 60 s piece timeout, unusual file names stored under generated ids, piece-size changes applying to the next piece, rule changes not re-checking rejected files.
- The largest "Max files" choice is 50, so the 100-file run accepted 50 and listed 50 as over the limit (responsiveness was measured on all 100).
- At a 50% failure rate a 20 MB file still fails about 0.5% of the time (12 tries per piece); Retry resumes it.
- The checksum reads the whole file into memory, fine at the 100 MB maximum but not for very large files.
- axe `region` (moderate) carried over from feature 001.
