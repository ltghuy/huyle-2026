---
id: 022
feature: google-sign-in
created: 2026-11-03
---

# Tasks: Sign in with Google

## Summary

Total: 27 | Completed: 25 | Remaining: 2

## Execution Plan

```
T001 --> T002 --> T003 --> T004 --> T005 (CPU gate: Better Auth or arctic fallback)
                                     |
          ┌--------------------------┼---------------------------┐
          v                          v                           v
        T006 --> T007              T009 --> T010 --> T011       T013 --> T014
          |        |                 |                 |          |
          v        v                 v                 v          v
        T008 ----> T012 <----------- ┘ (account sync)  |        T015 --> T016 --> T017
                    |                                  |          |
                    v                                  v          v
                  T018 --> T019 --> T020             T021       T022 --> T023
                                                                  |
                                                        T024 --> T025 --> T026 --> T027
```

- **Critical path:** T001–T005 (auth works and fits the CPU budget), then T006–T012 (progress moves and syncs), then T018–T020 (account card, sign-out, deletion).
- **Can run in parallel after T005:** the server locks (T009–T011), the UI gating (T013–T017) and the report (T021).

## Quality Gates

Run after each task or batch (from the repo root):

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- At the end of each group: `pnpm --filter learn-english build`. For groups that change UI or routes, also `pnpm --filter learn-english e2e`.

## Tasks

### Auth foundation and CPU spike

- [x] T001 [P] Add the auth env, bindings and local secrets
  - Covers `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `SYNC_CODES_UNTIL`. Touches `src/server/env.ts`, `wrangler.jsonc` vars, `cloudflare-env.d.ts` (via `pnpm cf:typegen`) and a documented `.dev.vars.example`.
  - **Done when:** `getEnv()` parses the new keys, rejects a short secret and an invalid URL in `env.test.ts`, and typecheck passes.

- [x] T002 [B:T001] Add the auth and progress tables and migration 0005
  - Tables: `user` (+ `stats_opt_out`), `session`, `account`, `verification`, `account_progress`, `account_activity`, plus `leaderboard_entries.user_id`.
  - Hand-write them from the core schema if `npx auth generate` can't load the per-request config, and diff against the generator's output.
  - **Done when:** `migrations/0005_auth.sql` applies in `sqliteDb()`; a test inserts a user with progress, activity and a board row, then deletes the user, and the cascade empties the others.

- [x] T003 [B:T002] Add Better Auth (pinned in the app), the per-request factory and the session seam
  - `src/server/auth/auth.ts` builds Better Auth for Google with a 30-day session, 1-day `updateAge` and a 5-minute cookie cache, `additionalFields.statsOptOut`, and `nextCookies()` last.
  - `src/server/auth/session.ts` provides `getSessionUser` and `requireUser`.
  - **Done when:** `session.test.ts` shows null without a cookie, a user with a valid session, and a Vietnamese 401 from `requireUser`; the bundle builds.

- [x] T004 [B:T003] Mount `/api/auth/[...all]`, add the `AUTH_LIMITER` binding, and sign in for real on localhost
  - Register the dev OAuth client and redirect URIs (owner action).
  - Done 2026-11-03: the owner signed in on localhost; local D1 has the user, one session, the progress copy and activity rows. Google pictures load with `referrerPolicy="no-referrer"` through the shadcn Avatar, with initials as the fallback.
  - **Done when:** on `pnpm dev`, "sign-in/social" → Google → back sets the `better-auth.session_token` cookie, and `get-session` returns the user; a cancel on Google's screen returns with `?error=`.

- [ ] T005 [B:T004] Measure CPU on a deployed preview and record the verdict
  - Deploy with `pnpm cf:english:upload:prebuilt`. Measure `callback/google`, `get-session` (cold and cookie-cached) and a dummy authenticated route with `wrangler tail` CPU time and the dashboard.
  - Record the numbers in design.md, and the decision in decisions.md and `.agents/knowledge.md`.
  - **Done when:** p99 is under 10 ms (keep Better Auth), or the `arctic` fallback behind `session.ts` passes the same measurement, or the owner has decided on Workers Paid.

### Account progress sync

- [x] T006 [B:T005] Add the progress service and `/api/progress` GET/PUT
  - Rev check as in `sync.service.ts`. The PUT batch also writes the `account_activity` row and `user.stats_opt_out`. Same size cap as sync.
  - **Done when:** service tests (real SQL) cover create at rev 0, 409 with the stored rev, one activity row per week and device, and the opt-out stored; route tests cover 401 and 413.

- [x] T007 [B:T006] Generalise `sync-client` over a `Remote`, add the account remote and `unauthorized` handling
  - **Done when:** the existing sync-code tests still pass on the code remote; new tests cover the account remote reconcile, and a 401 marking `account.expired` and stopping the loop.

- [x] T008 [P] Add the device-only `Profile.account`, `clearDevice()` and the summary counts
  - `Profile.account` is excluded from the snapshot meta and merge. `clearDevice()` also clears the sync fingerprint and backup-reminder keys. `summarize()` gains `grammarLearned` and `hardWords`.
  - **Done when:** snapshot and merge tests prove `account` never leaves the device; `replace.test.ts` covers `clearDevice`; `snapshot.test.ts` covers the new counts.

- [x] T012 [B:T007,T008] Add `linkAccount()` and `AccountLinker` for the first move, and start auto-sync for accounts in `SyncRunner`
  - Progress (2026-11-03): `linkAccount()` with its tests (`src/sync/account-sync.test.ts`: new account, merge, retry without duplicates, zero differences, expiry) is done; `AccountLinker`, the toast and the different-account dialog come with T013.
  - **Done when:** tests cover a new account (404 → PUT rev 0), an existing account (merge then PUT), a retry after a failed PUT with no duplicates and `linkedAt` set only on success, the "Đã chuyển … vào tài khoản" toast text, and the different-account dialog; `account-move.test.ts` passes the zero-differences check on a pre-feature fixture.

### Server-side locks

- [x] T009 [B:T005] Lock the content kinds in the items route
  - `grammar` and `writing` need a session and are served `private` with no edge put. `forms` stays public: the verb dialog shows its practice sentences as examples.
  - **Done when:** route tests show a guest gets 401 for each locked kind, a session gets `private` with no edge-cache read or put, and public kinds are unchanged.

- [x] T010 [B:T009] Require a session on the leaderboard and claims routes, and store `user_id` on board submit
  - **Done when:** route tests show 401 without a session on GET, POST and DELETE `/api/leaderboard` and on both claims routes; the service test shows `user_id` is saved.

- [x] T011 [B:T010] Retire sync-code creation and gate the code GET by `SYNC_CODES_UNTIL`
  - **Done when:** route tests show POST returns 410, GET works before the date and returns 410 after it, and DELETE still works for the post-merge delete.

### Guest gating in the UI

- [x] T013 [B:T005] Add the auth client, `useAccount()` and the sign-in button
  - The sign-in button carries `callbackURL` = the current URL and shows the cancel toast.
  - **Done when:** hook tests cover the `unknown`, `guest`, `signed-in` and `expired` states and offline use of the cached account; the button test checks the callback URL and the `?error=` toast.

- [x] T014 [B:T013] Show the sign-in button or the name and picture in the top-right corner
  - **Done when:** a component test shows the guest button, and for a signed-in learner the first name plus the picture, or initials when there's no picture.

- [x] T015 [B:T013] Add `SignInPrompt` and `SignInGate` with per-area Vietnamese copy and the privacy link
  - **Done when:** `sign-in-gate.test.tsx` covers a prompt per area for guests, children for signed-in learners, and a skeleton while the state is unknown.

- [x] T016 [B:T015] Gate the lesson and review areas
  - Covers: home lesson card and streak, `/lesson`, `/extra-lesson`, `/review`, `/review-session`, `/hard-words` and `/profile`. Every "Vào bài hôm nay" leads to sign-in for guests.
  - **Done when:** the updated `page.test.tsx`, `hard-words-view.test.tsx`, `profile.test.tsx` and leaderboard tests pass for both guests and signed-in learners.

- [x] T017 [B:T015,T009] Add guest previews for grammar, exercises and irregular verbs, and the guest-only content index
  - Grammar list from topic metadata. Exercise cards visible, but starting one shows the prompt. Verb list and dialog via the preview, with drills showing the prompt. Vocabulary and follow-set skip the locked kinds.
  - **Done when:** the grammar-browser, exercise-library, verbs-browser and vocabulary-browser tests pass for guests (preview plus prompt) and signed-in learners (unchanged); no 401 reaches the console as a guest on `/vocabulary`.
  - Done 2026-11-03: grammar rows from the syllabus with a lock for guests; the library's grammar and writing sets are absent for guests (their content is locked), the rest are listed and starting one shows the prompt; verbs list and dialog open, drills ask in a dialog. `forms` stays whole (see T009). The auth client is plain `fetch` (no `better-auth/react` in the bundle).

### Account card, sign-out and deletion

- [x] T018 [B:T012,T014] Add the Settings account card: name, email, picture, and the guest sign-in
  - **Done when:** `account-card.test.tsx` shows the fields for a signed-in learner and the sign-in button for a guest.

- [x] T019 [B:T018] Add sign-out with a last push and `clearDevice`
  - **Done when:** tests show the confirm dialog, a final push attempt (with a warning when it fails), the device cleared and the corner back to the guest state.

- [x] T020 [B:T019,T006] Add `DELETE /api/account` and the delete flow
  - The dialog offers export first, then confirm, delete, sign out and clear.
  - **Done when:** the route test covers the cascade, and the component test shows the export-first dialog and the device cleared after deletion.

### Usage report

- [x] T021 [B:T006] Add weekly account counts to `pnpm stats:report`
  - Counts: created, active, returning after week 1, and on 2+ devices, excluding `stats_opt_out`.
  - **Done when:** `stats-report.test.ts` covers each count with fixture rows, including an opted-out user who is left out.

### Sync codes, copy, notice, tour, privacy

- [x] T022 [B:T011,T012] Rework the sync panel
  - No new codes. Signed-in learners can merge a code until the date, then the code is deleted. Account copy. The backup panel copy says progress is kept in the account, and import merges.
  - **Done when:** the updated `sync-panel.test.tsx` and `settings.test.tsx` cover a merge before the date, the panel hidden after it, and the new copy.

- [x] T023 [B:T022] Replace "Không cần tài khoản" everywhere and update the hero note, closing CTA and site description
  - **Done when:** a grep for "Không cần tài khoản" and "không cần đăng ký" over `src` finds nothing; the home test asserts the new note.

- [x] T024 [B:T015] Add the one-time guest notice for devices that already hold progress
  - **Done when:** a test shows it once for a guest with progress, never for a fresh guest or a signed-in learner, and the flag stops repeats.

- [x] T025 [B:T024] Update the tour so locked steps say they need sign-in for guests, and keep `data-tour` targets on the prompts
  - **Done when:** `tour-steps.test.ts` and `tour.mobile.spec.ts` pass for a guest and a signed-in learner.

- [x] T026 [P] Add the `/privacy` page and link it from the prompts and Settings
  - **Done when:** the page prerenders (`○ /privacy` in the build output), says what is stored, why, that it is kept until deletion, and how to delete; the links are present.

### End-to-end and rollout

- [ ] T027 [B:T012,T016,T017,T020,T022,T023,T025,T026] Add an e2e sign-in fixture and specs, update the gated specs, and write the rollout steps
  - The fixture is a test-only session, enabled only by `E2E_AUTH=1` in the preview. New specs: guest limits; sign-in and first move; two devices; sign-out; delete. Update the gated specs.
  - Rollout in the spec notes: migration 0005 `--remote`, secrets, OAuth redirect URIs, `SYNC_CODES_UNTIL`, and the follow-up drop of `sync_profiles` after 7 days.
  - **Done when:** `pnpm --filter learn-english e2e` passes on desktop and mobile; the production bundle contains no e2e auth route (checked by grep on `.open-next`).

## Implementation Notes (2026-11-03)

- Left: T004 (live sign-in on localhost) and T005 (CPU on a deployed preview) need the owner's Google OAuth client; T027 (e2e) needs a working sign-in fixture.
- Import of a backup now merges for a signed-in learner (and keeps the account link); it used to replace everything, which would have dropped `profile.account` (T023).
- `isoWeek` lives in `src/lib/iso-week.ts`, shared by the progress service and `scripts/stats-report.ts` (which can't import `server-only` modules).
- The sync-code UI is now only the merge card; the old code functions in `sync-client.ts` (`turnOnSync`, `linkSync`, `previewSync`, …) stay until the follow-up removal after `SYNC_CODES_UNTIL`.
- The privacy page follows the Credits page layout; the `ui-ux-pro-max` skill was not run for it.

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T014, T018 |
| AC-002 | T004, T013, T014 |
| AC-003 | T004, T013 |
| AC-004 | T003 |
| AC-005 | T008, T019 |
| AC-006 | T007, T013 |
| AC-007 | T017 |
| AC-008 | T017, T027 |
| AC-009 | T017 |
| AC-010 | T015, T016 |
| AC-011 | T016 |
| AC-012 | T013 |
| AC-013 | T009, T010, T006 |
| AC-014 | T008, T012 |
| AC-015 | T012 |
| AC-016 | T007, T012, T027 |
| AC-017 | T007, T013 |
| AC-018 | T012 |
| AC-019 | T011, T022 |
| AC-020 | T022 |
| AC-021 | T011, T027 (follow-up drop) |
| AC-022 | T018 |
| AC-023 | T020 |
| AC-024 | T010 |
| AC-025 | T015, T026 |
| AC-026 | T024 |
| AC-027 | T006, T021 |
| AC-028 | T006, T021 |
| AC-029 | T023 |
| AC-030 | T025 |
