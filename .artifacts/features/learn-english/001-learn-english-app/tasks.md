---
id: 001
feature: learn-english-app
created: 2026-10-26
---

# Tasks: Learn English app

## Summary

Total: 50 | Completed: 5 | Remaining: 45

Content is built **A1 first** (T012) so every screen can be developed and tested on real data;
the rest of the levels (T049) are drafted and reviewed in parallel with UI work.
Owner gates: **T004** (Cloudflare setup in the dashboard), **T010** (approve the AI drafting spend after a dry run),
**T013** (pick the voice), **T012/T049** (content review).

## Execution Plan

```
T001 --> T002 --> T003 --> T004 (owner: Cloudflare resources + first deploy)
  |        |
  |        └--> T006 (DB schema) ------------------------------┐
  ├--> T005 (agent rules)                                        |
  └--> T028 (app shell) --┐                                      |
                          |                                      |
T007 (content schema) --> T008 --> T009 --┐                      |
        └--> T010 (owner: spend) --> T011 -┼--> T012 (A1 content) --> T014 (publish) --> T015 (content API)
T013 (audio + owner: voice) ---------------┘                                 |                |
                                                                             |                v
T017 (SRS) ----------------------------┐                                     |     T016 (content client) <-- T018
T018 (IndexedDB storage) ---------------┼--------------------------------------------------┘
T019 (normalize) --> T022 (word ex.) ---┤
             └-----> T023 (sentence ex.)┼--> T024 (lesson plan)
T020 (attendance)  T021 (hard words)  T025 (placement)  T026 (snapshot) --> T027 (merge)
                                        |
T028 --> T029 (exercise UI) --> T030 (sentence UI)
                                        |
            ┌---------------------------┴-------------------------------------------┐
            v                                                                       v
T031 vocab  T032 credits  T033 review  T034 library  T035 hard words  T036 lesson --> T037 profile --> T038 insights
T039 placement  T040 tour  T041 grammar  T042 settings/backup
            |
T006 ---> T043 (sync API) --> T044 (sync client)      T045 (stats API) --> T046 (stats client) --> T047 (report)
            |
            └--> T048 (E2E suites) --> T049 (A2–C1 content, owner review) --> T050 (launch)
```

Parallel branches (sub-agent candidates): the pure learning modules T017–T027, the content scripts T008–T013,
and the API pairs T043/T045 once T006 lands.

## Quality Gates

Run after each task or batch (from the repo root):

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english e2e` (from T003 on, after UI tasks)

## Tasks

### Scaffold and deploy

- [x] T001 [P] Scaffold `apps/learn-english`: Next.js 16.3.8, React 19.2.8, Tailwind v4, shadcn `base-nova`, `@repo/typescript-config` / `@repo/eslint-config`, dev port 3002, `<html lang="vi">`, Be Vietnam Pro (`vietnamese` + `latin`), Vietnamese placeholder home, `AGENTS.md` + app `CLAUDE.md`
  - **Done when:** `pnpm --filter learn-english dev` serves the placeholder on :3002; lint and typecheck pass; `@types/react` resolves to the single workspace version -- VERIFIED

- [x] T002 [B:T001] Add OpenNext + wrangler (static-assets incremental cache, `DB` D1 binding, `SYNC_LOOKUP_LIMITER` rate-limit binding, route `english.huyle.work`), app `cf:*` scripts, root `cf:english:*` forwarders, `NEXT_PUBLIC_AUDIO_BASE_URL` in turbo `build.env`, and the CLAUDE.md layout/commands section
  - **Done when:** `pnpm cf:english:preview` serves the placeholder locally, and the CLAUDE.md commands list matches the root scripts -- VERIFIED

- [x] T003 [B:T002] Set up Vitest (happy-dom, `fake-indexeddb`) and Playwright (`@playwright/test` 1.64.1, dedicated port, server = `opennextjs-cloudflare preview` with local D1) with one smoke test each
  - **Done when:** `pnpm --filter learn-english test` and `e2e` pass, and `pnpm test` at the root runs them through turbo -- VERIFIED

- [ ] T004 [B:T003] Create the Cloudflare resources and do the first deploy (owner in the dashboard, guided step by step): D1 `learn-english`, R2 `learn-english-audio` on `audio.english.huyle.work` with r2.dev off and a Cache Rule for `.mp3`, Worker custom domain, Workers Builds project (root `/`, `cf:english:*` commands, watch paths from knowledge.md), `STATS_SALT` secret
  - **Done when:** https://english.huyle.work shows the placeholder; the build log's `Executing user build command:` line shows `pnpm cf:english:build`; knowledge.md Codebase Feedback is updated with the real IDs

- [x] T005 [B:T001] Add app-scoped agent rules in `.claude/rules/learn-english/` (architecture/layering, UI with shadcn, Vietnamese copy, spec-driven), each with only `paths:` frontmatter
  - **Done when:** rules load only for `apps/learn-english/**` files (checked against the `paths:` globs) -- VERIFIED

### Database

- [x] T006 [B:T002] Add the Drizzle schema and first migration (`content_items`, `content_meta`, `sync_profiles`, `stats_daily`, `stats_devices`), per-request `getDb()`, `src/server/env.ts`, `src/lib/http.ts`
  - **Done when:** `drizzle-kit generate` output applies with `wrangler d1 migrations apply learn-english --local`; typecheck passes; a test confirms `getDb()` is never called at module scope -- VERIFIED

### Content pipeline (A1 first)

- [ ] T007 [P] Write the content Zod schemas per kind (word, grammar, sentence, writing, placement) in `src/content/schema.ts`, shared by scripts, API and client
  - **Done when:** unit tests accept a valid sample of each kind and reject missing fields, sentences without `acceptedOrders`, and unknown levels

- [ ] T008 [B:T007] Write `scripts/import-wordlists.ts`: CEFR-J 1.5 + Octanove C1 CSVs (committed with their licence/citation files) → deduped word skeletons in `content/word/{level}.json` with `source`
  - **Done when:** the script is idempotent; per-level counts are printed and match the source after dedupe; every row has `source`

- [ ] T009 [B:T008] Write `scripts/build-ipa.ts` + `scripts/lib/arpabet.ts`: CMUdict join, ARPAbet→IPA, maximal-onset stress placement; list words with no entry
  - **Done when:** tests pass for a 30-word sample including stress and multi-syllable words (e.g. `homework` /ˈhoʊmˌwɝk/); a missing-entry report is written

- [ ] T010 [B:T007] Write `scripts/draft-content.ts` (Batches API, structured outputs, `claude-opus-5-5`): words (meanings, topic, synonyms, 1–2 example sentences with tokens, accepted orders, wrong variants, gap candidates), grammar topics, writing tasks, placement bank; dry run on 20 A1 words with a cost report
  - **Done when:** the dry-run output validates against the schemas, and the **owner approves the projected full cost** before any larger run

- [ ] T011 [B:T010] Write `scripts/review.ts`: list drafts by level/kind, approve by file or id, validate
  - **Done when:** approving flips `status` only for the selected items and refuses items that fail validation

- [ ] T012 [B:T009,T011] Draft and review the A1 set: all A1 words + their sentences, the first 6 grammar topics (incl. Present Simple, Present Continuous), A1 writing tasks, and the placement bank for all levels (owner review)
  - **Done when:** the owner has approved A1 content and placement items; schema validation is clean

- [ ] T013 [P] Write `scripts/generate-audio.ts` (Google Chirp 3 HD → MP3 → R2 with an immutable cache header, key `sha256(voice|text)`); generate 4 male voice samples for the owner
  - **Done when:** the owner has picked the voice; generating the A1 set uploads files that play from `audio.english.huyle.work` with a long-lived `Cache-Control`

- [ ] T014 [B:T006,T012,T013] Write `scripts/publish-content.ts` (`--local`/`--remote`): validate approved items, generate missing audio, chunked SQL upserts, tombstones for removed ids, bump `content_meta.version`
  - **Done when:** tests cover skipping drafts, tombstones, version bump and chunking; A1 is published to local D1

### Content API and client

- [ ] T015 [B:T014] Build `GET /api/content/version` and `GET /api/content/items` with Cache API caching keyed by URL + `v`, and cache headers
  - **Done when:** service tests pass; under `cf:english:preview` a repeated items request is served from cache (verified with a header or log); if `caches.default` is unavailable, the documented D1-read fallback is in place and noted in knowledge.md

- [ ] T016 [B:T015,T018] Build `src/content/client.ts`: version polling (on open/focus, ≤ 5 min), per kind/level fetch, IndexedDB cache, tombstones, offline fallback
  - **Done when:** tests cover a version change triggering a refetch, offline using the cache, no cache showing an error state, and tombstoned ids being hidden (AC-052, AC-054, AC-055)

### Learning engine (pure modules)

- [ ] T017 [P] Write `src/learning/srs.ts` (ts-fsrs **5.4.2** exact, configured params) and `src/learning/rating.ts`
  - **Done when:** tests pass: wrong → due within minutes; fast correct → growing intervals; slow (> 8 s), hint or typo → Hard; self-mark mapping; Easy never produced (AC-010, AC-013)

- [ ] T018 [P] Build the IndexedDB storage layer: `db.ts` (schema/upgrades via `idb`), repositories (cards, attempts with UUIDs, lessons, attendance, meta, content), `broadcast.ts`, persistence check + in-memory fallback, `navigator.storage.persist()`
  - **Done when:** `fake-indexeddb` tests pass, including concurrent attendance `add()` for one date producing one row (AC-005, AC-015)

- [ ] T019 [P] Write `src/learning/normalize.ts`: Telex/VNI folding, case/space trim, variant spellings, sentence tokenizer
  - **Done when:** tests pass for â→aa, ê→ee, ô→oo, ư→uw, ơ→ow, đ→dd, tone marks stripped; `colour` accepted for `color`

- [ ] T020 [P] Write `src/learning/attendance.ts`: points, bonus at 7/30/100, current/longest streak in the learner's time zone
  - **Done when:** tests cover a streak increment, a reset after a missed day, longest kept, bonuses, and a midnight boundary in `Asia/Ho_Chi_Minh` (AC-017, AC-018)

- [ ] T021 [P] Write `src/learning/hard-words.ts`: wrong in ≥ 3 of the last 8, or average > 8 s over the last 5; exit after 4 correct in a row under 5 s; difficulty sort
  - **Done when:** tests cover each rule and the reason label (AC-030, AC-032)

- [ ] T022 [B:T019] Write the word exercise generators: `mcq`, `missing-letters`, `listening`, `recall`, `grammar-gap` (seeded)
  - **Done when:** tests pass: MCQ has 4 options with exactly one correct, with synonyms and shared meanings excluded; missing-letters rules (1 blank for ≤ 3 letters, never the first letter of longer words, never space/hyphen/apostrophe); the same seed gives the same instance (AC-027, AC-028)

- [ ] T023 [B:T019] Write the sentence exercise generators + graders: `word-order`, `sentence-gap`, `choose-sentence`, `tile-translate`
  - **Done when:** tests pass: every accepted order is accepted; duplicate tokens are interchangeable; tile distractors never form a valid sentence; choose-sentence has exactly one correct option (AC-033, AC-034)

- [ ] T024 [B:T017,T022,T023] Write `src/learning/lesson-plan.ts`
  - **Done when:** tests pass: part order review → new words → grammar (every 2nd day or when due) → sentences → writing; MCQ mixed into parts; review cap 50 by lowest retrievability; 10 new words, or 5 when > 50 are overdue; deterministic per date; tombstoned items skipped; level change applies to the next plan (AC-012, AC-014, AC-022)

- [ ] T025 [P] Write `src/learning/placement.ts`: staged test (start A2, 5 items per stage, up on ≥ 4/5, down on ≤ 2/5, stop at 30 items or when stable) → level
  - **Done when:** tests cover the item cap, staging up and down, and the estimates for all-correct / all-wrong / mixed answers (AC-019)

- [ ] T026 [B:T018] Write `src/learning/snapshot.ts`: schema, trimming (30 days of attempts + last 8 per item), summary, version migrations, gzip encode/decode
  - **Done when:** tests pass: round trip; damaged file rejected; newer version rejected; older version upgraded; a typical heavy profile stays < 1 MB gzipped (AC-042, AC-043)

- [ ] T027 [B:T026] Write `src/learning/merge.ts`
  - **Done when:** tests pass: attempt union by UUID; later `last_review` wins (tie: more reps); attendance union never doubles points; completed lesson wins; profile fields last-writer-wins (AC-050)

### App shell and exercise UI

- [ ] T028 [B:T001] Build the app shell: layout, sidebar/sheet navigation with `data-tour` targets, Vietnamese route stubs (`/tu-vung`, `/ngu-phap`, `/on-tap`, `/bai-tap`, `/tu-kho`, `/ho-so`, `/cai-dat`, `/kiem-tra-trinh-do`, `/nguon-du-lieu`), storage-unavailable banner, toast provider
  - **Done when:** every route renders statically (build output shows them as static); the banner appears when IndexedDB is blocked; all copy is Vietnamese (AC-001, AC-004)

- [ ] T029 [B:T028,T022] Build `AudioButton`, `ExerciseRunner` (timing, attempts, score, swapping listening for recall on audio failure) and the word exercise components (MCQ with explanation, missing-letters on `InputOTP` with the Telex hint, listening, recall, grammar-gap)
  - **Done when:** component tests pass, and keyboard-only completion works (AC-003, AC-008, AC-027, AC-028, AC-029)

- [ ] T030 [B:T029,T023] Build the sentence exercise components (word-order and tile-translate with tap-to-place tiles, sentence-gap, choose-sentence) showing the correct sentence, translation, audio, explanation and related-item link; free-writing self-check
  - **Done when:** component tests pass; a wrong answer links the related word/grammar and makes that card due now (AC-033–AC-036)

### Learner pages

- [ ] T031 [B:T016,T029] Build the vocabulary page: level/topic browse via query params, learned markers, word dialog (headword, IPA, POS, meanings, examples + translations, audio), "mark learned"
  - **Done when:** an e2e check on A1 content shows every AC-007 field, and marking a word learned creates a card (AC-006–AC-009)

- [ ] T032 [B:T028] Build the credits page (CEFR-J citation, Octanove CC BY-SA 4.0 notice, CMUdict notice)
  - **Done when:** the page renders the three attributions with links (AC-045)

- [ ] T033 [B:T024,T030] Build the review page: due count, session with varied exercise types, results
  - **Done when:** e2e: after learning words and moving the clock forward, due items appear and answering reschedules them (AC-011, AC-012)

- [ ] T034 [B:T030,T016] Build the exercise library: list by level/topic/grammar with type filters, runner, score feeding the SRS
  - **Done when:** filters narrow the list; finishing an exercise shows a score and records attempts (AC-026, AC-029)

- [ ] T035 [B:T021,T030] Build the hard words page: sorted list with reason, practice session with only those words
  - **Done when:** e2e with seeded attempts shows the right words, reasons and order; the practice session contains only hard words (AC-030, AC-031)

- [ ] T036 [B:T024,T030,T020] Build the home daily lesson: today's plan, parts, resume, completion screen with points/bonus, attendance `add()`
  - **Done when:** e2e: complete a lesson → +10 points, streak 1; leave mid-lesson and return → same position; reload after completion → no second award (AC-014–AC-016)

- [ ] T037 [B:T036] Build the profile page: total points, current and longest streak, attendance calendar
  - **Done when:** values match seeded attendance data in a component test (AC-017, AC-018)

- [ ] T038 [B:T037] Add progress insights to the profile: words learned per level, grammar topics completed, 30-day accuracy
  - **Done when:** values match seeded data (AC-037)

- [ ] T039 [B:T025,T030,T028] Build the placement page and first-visit routing: offered first, skippable (→ A1), result with a Vietnamese explanation, sets the level
  - **Done when:** e2e: fresh browser lands on the placement offer; skip → A1; finishing sets the estimated level (AC-002, AC-019–AC-021)

- [ ] T040 [B:T028,T039] Add the welcome dialog and tour (`@diceui/tour` via the shadcn CLI): steps over the `data-tour` targets, counter, back/next/close, `role="dialog"`, Esc/arrow keys, opening the mobile sheet or centering when the target is hidden, `tourSeen`
  - **Done when:** e2e (desktop + 390 px mobile): it shows once after placement, can be completed by keyboard, and doesn't show again after reload (AC-038–AC-040)

- [ ] T041 [B:T016,T030] Build the grammar pages: list by level with progress; topic view (rule, pattern, usage, signal words, mistakes, examples with audio); practice; card on finish
  - **Done when:** e2e on an A1 topic shows every AC-024 field; finishing practice creates a grammar card (AC-013, AC-023–AC-025)

- [ ] T042 [B:T026,T039,T040] Build the settings page: level change, retake placement, replay tour, backup panel (export, import with summary + confirm, reset with confirm + export suggestion), 14-day backup reminder
  - **Done when:** e2e: export then import into a new browser context restores the same summary; a damaged file shows an error and changes nothing; replay starts the tour at step 1 (AC-021, AC-022, AC-041–AC-044)

### Sync

- [ ] T043 [B:T006] Build the sync API (`POST/GET/PUT/DELETE /api/sync`): server-side code generation (12 Crockford base32 chars), SHA-256 storage, rev check via conditional UPDATE, 1 MB cap, failed-lookup throttle, cleanup of rows older than 365 days on create
  - **Done when:** service tests cover create (only the hash stored), 404, 409 on a stale rev, 413, delete, throttle and cleanup. If the rate-limit binding isn't on the free plan, the D1 counter fallback is used and noted in knowledge.md (AC-047, AC-049, AC-051)

- [ ] T044 [B:T043,T027,T042] Build the sync client and settings panel: turn on (code + copy + warning), link with code (summary + confirm), debounced push (≤ 60 s, on hide), 409 merge-retry, offline retry, last-synced time, unlink, delete server data
  - **Done when:** e2e with two browser contexts: progress on A appears on B within 2 minutes; edits on both merge without losing attempts or doubling points (AC-047–AC-051)

### Usage stats

- [ ] T045 [B:T006] Build `POST /api/stats`: validate, clamp to 20 wrong-word keys, daily device hash with `STATS_SALT`, one `db.batch()` of upserts, always 204
  - **Done when:** service tests cover clamping, hashing, invalid input → 204 with no writes (AC-056)

- [ ] T046 [B:T045,T018] Build the stats client: local daily counters, `sendBeacon` on day change/hide, opt-out toggle in settings
  - **Done when:** tests: counters roll per day; with the opt-out on, no request is sent; send failures are ignored (AC-056, AC-057)

- [ ] T047 [B:T045] Write `scripts/stats-report.ts --from --to` (`wrangler d1 execute --remote --json`)
  - **Done when:** run against local D1 with seeded rows, it prints lessons, distinct devices, exercises per type and the top missed words (AC-058)

### End-to-end, full content, launch

- [ ] T048 [B:T036,T040,T042,T044] Complete the e2e suites: first visit, backup, sync, exercises (all kinds), tour a11y, offline content fallback
  - **Done when:** `pnpm --filter learn-english e2e` passes locally and in CI mode (`CI=1`)

- [ ] T049 [B:T012] Draft, review, add audio for, and publish the A2, B1, B2 and C1 content (words, sentences, all grammar topics incl. the 12 tenses, writing tasks), in owner-reviewed batches per level
  - **Done when:** 100% of A1–C1 words are approved with meaning, IPA, example and audio; schema validation is clean; the remote publish succeeds

- [ ] T050 [B:T048,T049,T004] Run the launch checks and deploy: remote migrations; publish content `--remote`; confirm with `cf:english:preview` and production that page shells come from static assets and API handlers make one D1 call; Lighthouse a11y ≥ 95 on the main pages; Vietnamese copy audit of every screen; first-lesson usability run (3 people, < 15 min)
  - **Done when:** every spec Success Criterion is checked with evidence, ready for `audit`

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T028 |
| AC-002 | T039 |
| AC-003 | T013, T029 |
| AC-004 | T001, T028, T050 |
| AC-005 | T018 |
| AC-006 | T031 |
| AC-007 | T009, T012, T031 |
| AC-008 | T013, T029, T031 |
| AC-009 | T031 |
| AC-010 | T017 |
| AC-011 | T033 |
| AC-012 | T024, T033 |
| AC-013 | T017, T041 |
| AC-014 | T024, T036 |
| AC-015 | T018, T036 |
| AC-016 | T036 |
| AC-017 | T020, T037 |
| AC-018 | T020, T037 |
| AC-019 | T025, T039 |
| AC-020 | T039 |
| AC-021 | T039, T042 |
| AC-022 | T024, T042 |
| AC-023 | T041 |
| AC-024 | T012, T041 |
| AC-025 | T041 |
| AC-026 | T034 |
| AC-027 | T022, T029 |
| AC-028 | T022, T029 |
| AC-029 | T029, T034 |
| AC-030 | T021, T035 |
| AC-031 | T035 |
| AC-032 | T021 |
| AC-033 | T023, T030 |
| AC-034 | T023, T030 |
| AC-035 | T030 |
| AC-036 | T030 |
| AC-037 | T038 |
| AC-038 | T040 |
| AC-039 | T040 |
| AC-040 | T040 |
| AC-041 | T042 |
| AC-042 | T026, T042 |
| AC-043 | T026, T042 |
| AC-044 | T042 |
| AC-045 | T032 |
| AC-046 | retired (no task) |
| AC-047 | T043, T044 |
| AC-048 | T044 |
| AC-049 | T043, T044 |
| AC-050 | T027, T044 |
| AC-051 | T043, T044 |
| AC-052 | T014, T016 |
| AC-053 | T014 |
| AC-054 | T014, T016 |
| AC-055 | T016 |
| AC-056 | T045, T046 |
| AC-057 | T046 |
| AC-058 | T047 |
