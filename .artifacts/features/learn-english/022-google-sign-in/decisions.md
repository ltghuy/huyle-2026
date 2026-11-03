---
id: 022
feature: google-sign-in
created: 2026-11-03
---

# Decisions: Sign in with Google

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### Sign-in required or optional

- **Question:** Should signing in be optional (guests keep the whole app) or required?
- **Decision:** Required for everything except vocabulary and the placement test. Progress already on the device moves into the account at first sign-in.
- **Rationale:** Owner's choice (2026-11-03). The recommendation was optional sign-in, to keep the "no account needed" promise; the owner preferred a clear reason to sign in.
- **Caveats:** Supersedes feature 001 "Users and progress storage" (2026-10-26). Learners who don't want a Google account lose access to everything but vocabulary.

### What guests can use

- **Question:** Besides Từ vựng, which areas stay open to guests?
- **Decision:** Only the placement test. Ôn tập, Từ khó, the streak, points and the top-10 board need sign-in.
- **Rationale:** Owner's choice. Vocabulary browsing and the level test show what the app offers; the learning loop (lesson, review, streak) is the reason to sign in.
- **Caveats:** A guest can mark words learned and follow a set, but nothing reviews those words until they sign in.

### Daily lesson for guests

- **Question:** Should guests get a vocabulary-only daily lesson, no lesson, or the full lesson?
- **Decision:** Locked. The home page's lesson, the lesson screen and extra lessons ask guests to sign in.
- **Rationale:** Owner's choice. Keeps one lesson shape instead of a separate guest variant.

### Sync codes

- **Question:** Keep sync codes alongside accounts?
- **Decision:** Retire them. No new codes; an existing code can be merged into an account once until a cut-off date, then codes stop working and their data is deleted.
- **Rationale:** Recommended and chosen. The account does the same job without a bearer secret.
- **Caveats:** The window is 7 days after release (answers below).

### Locked areas for guests

- **Question:** What does a guest see on Ngữ pháp, Bài tập and Động từ bất quy tắc?
- **Decision:** A preview of what the area contains, with a sign-in prompt when they open a topic, exercise or drill.
- **Rationale:** Recommended and chosen. Showing the content list sells the sign-in better than an empty wall or a hidden menu item.

### Answers to the spec's open questions (2026-11-03)

- **Question:** Purpose, session length, sync-code window, guest top-10, account retention.
- **Decision:** Sign-in is for learner return, multi-device use and counting learners (adds the owner's usage counts, AC-027/028). Sessions last 30 days and renew on activity. Existing sync codes can be merged for 7 days after release, then stop working and are deleted. Guests don't see the top-10 board. Accounts are kept permanently until the learner deletes them.
- **Rationale:** Owner's answers.
- **Caveats:** No one uses sync codes in production today, so the 7-day window is a safety net, not a migration path.

### What the app calls a signed-in learner (2026-11-03)

- **Question:** Feature 003 asks every learner for a name before anything else. What happens once Google gives one?
- **Decision:** The app greets and addresses a signed-in learner by their Google name. The name in Settings becomes an optional nickname that replaces it, and can be cleared. The must-answer name dialog is only shown to guests. The certificate uses the nickname, else the Google name; the leaderboard still only shows a name the learner chose (AC-024).
- **Rationale:** Owner's request.

### The leaderboard ranks Google accounts (2026-11-03)

- **Question:** The board was keyed by a random id each browser made, and showed only a name typed for the board. What now?
- **Decision:** One entry per Google account (its id is the account id); a submit drops the learner's older browser-made entries. The shown name is the chosen name from Settings, else the Google name; the board's own name field is gone. The email and picture are never shown.
- **Rationale:** Owner's request. Supersedes the tentative "Name shown to others" below and the original AC-024.

### A1 grammar is open to guests (2026-11-03)

- **Question:** Should guests be able to learn any grammar?
- **Decision:** Yes, the A1 topics: their list rows link, the topic page with its lesson and practice opens, and the server serves A1 grammar as public, edge-cached content. A2 and above keep the lock. The exercise library stays locked for guests.
- **Rationale:** Owner's request, so guests can try grammar as well as vocabulary.

## Tentative

Safe defaults chosen without asking. Revisit if the owner disagrees.

### Cross-device timing

- **Question:** How fast must changes reach another device?
- **Tentative Decision:** The next time that device opens or reconnects; no live updates.
- **Revisit when:** Learners report switching devices mid-session.

### Device data at sign-out

- **Question:** What happens to the progress on the device when a learner signs out?
- **Tentative Decision:** It is removed from the device after confirmation; the account keeps it.
- **Revisit when:** Learners mostly use personal devices and want offline access after signing out.

### Combining device and account progress

- **Question:** When both the device and the account hold progress, which wins?
- **Tentative Decision:** Merge with the rules the app already uses for sync-code merges (most advanced review state per word, union of attendance); for single values (level, followed set) the most recent change wins.
- **Revisit when:** Merge tests show a learner-visible surprise.

### Name shown to others

- **Question:** Should the top-10 board use the Google name?
- **Tentative Decision:** No. The learner's chosen nickname stays the public name; the Google name and picture are only shown to the learner.
- **Revisit when:** Never without a privacy review.

### Account deletion and privacy note

- **Question:** Are deletion and a privacy note part of this feature?
- **Tentative Decision:** Yes, both in P2, because storing email and name brings duties under Vietnam's personal data rules.
- **Revisit when:** Legal advice says more is needed (consent records, data export on request).

### Backup file

- **Question:** Does export/import stay?
- **Tentative Decision:** Export stays for signed-in learners and is offered before account deletion; import merges into the account.
- **Revisit when:** The owner wants fewer settings.
