---
id: 022
feature: google-sign-in
type: brownfield
scope: complex
status: in-progress
branch: main
created: 2026-11-03
---

# Feature: Sign in with Google

## Overview

Streak Daily has no accounts today. Each learner's progress lives in one browser. Moving it to another device takes a sync code, and clearing browser data loses it unless a backup was exported. The owner wants learners to sign in with their Google account. Signed-in learners get the whole course and the same progress on every device. Guests can still try the vocabulary and the placement test.

This reverses feature 001's decision "Users and progress storage" (no sign-in). Signing in becomes required for everything except vocabulary and the placement test. Progress a learner already has in the browser moves into their account the first time they sign in, so nobody starts over.

## Goals

- [ ] Signing in with a Google account takes a learner from a sign-in prompt back to where they were in under 30 seconds
- [ ] Every learner who signs in keeps all the progress they had on that device: nothing is lost in the move
- [ ] A signed-in learner sees the same progress on every device they sign in on
- [ ] Guests can use vocabulary and the placement test; every other area needs sign-in in the app, and everything that isn't vocabulary content is also refused when the service is called directly
- [ ] The service keeps running on the current free hosting plan at today's traffic
- [ ] The owner can see how many learners have an account, how many come back each week and how many use more than one device

## Out of Scope

| Feature | Reason |
|---------|--------|
| Sign-in with anything other than Google (email and password, Facebook, Apple, magic links) | Owner asked for Google only; more providers can follow |
| Paid plans, subscriptions or ads | Not part of this change |
| Teachers, classes or shared progress between learners | No such use case yet |
| Changing what the lessons, review or exercises teach | Only who can reach them changes |
| Moving progress between two different Google accounts | One account per learner; deleting and re-creating covers the rare case |
| Email from the app (newsletters, reminders) | No consent or need yet |

## User Stories

### P1: Sign in and out with Google

- As a learner, I want to sign in with my Google account so that the app knows me on any device
- **Why P1:** Nothing else in this feature works without it
- **Independent Test:** On a fresh browser, choose "Đăng nhập với Google", pick an account, and land back on the same page signed in. Reload: still signed in. Sign out: back to guest.

**Acceptance Criteria:**

- [ ] AC-001: WHEN a guest opens any page THEN system SHALL offer "Đăng nhập với Google" in the top-right corner (where the greeting is today) and in Settings
- [ ] AC-002: WHEN a guest chooses to sign in and picks a Google account THEN system SHALL bring them back to the page they started from, signed in, greeted by their Google name (or the name they chose in Settings, which is optional once signed in) with their Google picture, or their initials, in the top-right corner
- [ ] AC-003: WHEN the learner cancels or refuses on Google's screen THEN system SHALL bring them back as a guest with a short Vietnamese message, and change nothing
- [ ] AC-004: WHEN a signed-in learner reloads, closes the browser or comes back days later THEN system SHALL keep them signed in until they sign out, or until 30 days pass without any activity: each visit or action renews the 30 days
- [ ] AC-005: WHEN a signed-in learner chooses "Đăng xuất" and confirms THEN system SHALL sign them out, remove that account's progress from this device and show the app as a guest. Their progress stays safe in the account
- [ ] AC-006: WHEN the session expires or is ended elsewhere THEN system SHALL keep any progress made on the device, ask the learner to sign in again, and send that progress to the account once they do

### P1: What guests can and can't do

- As the owner, I want guests to try the vocabulary freely but sign in for the rest, so that learners see what the app offers and have a reason to create an account
- **Why P1:** This is the access rule the feature exists to introduce
- **Independent Test:** As a guest, every vocabulary action and the placement test work; Ngữ pháp, Bài tập and Động từ bất quy tắc show a preview and ask for sign-in when an item is opened; the daily lesson, Ôn tập and Từ khó ask for sign-in; a direct request for locked content is refused.

**Acceptance Criteria:**

- [ ] AC-007: WHEN a guest uses Từ vựng THEN system SHALL allow everything it allows today: browse sets and levels, open word details, play audio, follow a set ("Học bộ này") and mark words learned; the same goes for A1 grammar topics in Ngữ pháp
- [ ] AC-008: WHEN a guest takes the placement test THEN system SHALL run it as today and keep the level it finds on the device
- [ ] AC-009: WHEN a guest opens Ngữ pháp, Bài tập or Động từ bất quy tắc THEN system SHALL show what the area contains (the grammar topic list, the exercise sets and their filters, the verb list with each verb's forms and examples) and, when the guest opens a grammar topic above A1, starts an exercise set or starts a verb drill, ask them to sign in instead. A1 grammar topics, with their lesson and practice, are open to guests (owner, 2026-11-03)
- [ ] AC-010: WHEN a guest opens the daily lesson (the home page's "Bài học hôm nay", the lesson screen or an extra lesson), Ôn tập or a review session, Từ khó, or Hồ sơ (attendance calendar, top-10 board and progress charts) THEN system SHALL show a sign-in prompt in its place that says what signing in unlocks
- [ ] AC-011: WHEN a guest is on the home page THEN system SHALL show a sign-in prompt in place of today's lesson card and the streak and points, and every "Vào bài hôm nay" SHALL lead to sign-in
- [ ] AC-012: WHEN a guest signs in from a prompt THEN system SHALL take them straight to the area or item they tried to open
- [ ] AC-013: WHEN anyone who isn't signed in asks the service for locked content or locked actions directly (grammar lessons above A1 and their practice, writing tasks, the top-10 board and joining it, sending answers for review, progress sync) THEN system SHALL refuse with a Vietnamese message and reveal nothing beyond the preview. Exercises built from words, example sentences and irregular verbs, which guests can already read in Từ vựng and the verb list, are locked in the app only

### P1: Progress moves into the account

- As a learner who has been using the app without an account, I want my progress to come with me when I sign in, so that I don't lose my streak or my review schedule
- **Why P1:** Current learners would otherwise lose everything they built, which is the biggest risk of the change
- **Independent Test:** With a device that has progress (words learned, a review schedule, a streak, points, hard words, grammar progress, level and followed set), sign in with a new Google account: everything is still there. Sign in to the same account on a second, empty device: the same progress appears.

**Acceptance Criteria:**

- [ ] AC-014: WHEN a learner signs in for the first time on a device that holds progress THEN system SHALL move all of it into the account (learned words and their review schedule, lesson history, streak and attendance, points, hard words, grammar and exercise progress, level, followed set and learning settings) and say what moved (for example "Đã chuyển 120 từ và chuỗi 15 ngày vào tài khoản")
- [ ] AC-015: WHEN the account already holds progress from another device and the device holds progress too THEN system SHALL merge them with nothing lost: each word keeps its most advanced review state, attendance is the union of both, and points and streak follow the same rules the app already uses for combining progress
- [ ] AC-016: WHEN a signed-in learner opens the app on another device THEN system SHALL show the account's progress once it has loaded, and changes made on one device SHALL appear on the other the next time it opens or comes back online
- [ ] AC-017: WHEN a signed-in learner loses the network THEN system SHALL let them keep learning on the device and send the progress to the account when the network returns
- [ ] AC-018: WHEN moving progress fails part-way (network drop, closed tab) THEN system SHALL keep the device's progress, retry on the next visit and never count anything twice

### P2: Sync codes retire

- As a learner who used a sync code, I want to bring that progress into my account, so that the code isn't the only place it lives
- **Why P2:** Sync codes are replaced by the account, but existing codes hold progress that must not be stranded

**Acceptance Criteria:**

- [ ] AC-019: WHEN this feature ships THEN system SHALL stop creating new sync codes and say in Settings that the account now keeps progress in step across devices
- [ ] AC-020: WHEN a signed-in learner enters an existing sync code within 7 days of release THEN system SHALL merge that code's progress into the account (as in AC-015) and retire the code
- [ ] AC-021: WHEN 7 days have passed since release THEN system SHALL stop accepting sync codes and delete the progress stored under them

### P2: Account and personal data

- As a learner, I want to see what the app keeps about me and delete it, so that I stay in control of my data
- **Why P2:** Storing a learner's email and name brings legal duties the app didn't have before

**Acceptance Criteria:**

- [ ] AC-022: WHEN a signed-in learner opens Settings THEN system SHALL show the account (name, email, picture) with "Đăng xuất" and "Xoá tài khoản"
- [ ] AC-023: WHEN a learner chooses "Xoá tài khoản" THEN system SHALL offer a backup download first, ask them to confirm, then delete the account and all its progress from the service, remove it from the device and show the app as a guest
- [ ] AC-024: WHEN anything is shown to other learners (the top-10 board) THEN system SHALL rank one entry per Google account and show the learner's chosen name, else their Google name, never their email or picture (changed 2026-11-03 at the owner's request; it used to forbid the Google name)
- [ ] AC-025: WHEN a guest sees a sign-in prompt or opens Settings THEN system SHALL link to a Vietnamese privacy note that says what is stored (email, name, picture, learning progress), why, that it is kept until they delete the account, and how to delete it

### P2: Existing learners are told about the change

- As a learner who used the app before this change, I want to understand why the lesson now asks me to sign in, so that I don't think my progress is gone
- **Why P2:** Without it, the first visit after release looks like lost access

**Acceptance Criteria:**

- [ ] AC-026: WHEN a learner with progress on the device opens the app as a guest for the first time after release THEN system SHALL show a one-time notice: the lesson, review and practice now need a Google sign-in, their progress is safe on this device and will move into the account when they sign in

### P2: The owner sees who learns

- As the owner, I want to know how many learners have accounts, return and use several devices, so that I can tell whether the app is working
- **Why P2:** One of the three reasons for adding sign-in, but learners are served without it

**Acceptance Criteria:**

- [ ] AC-027: WHEN the owner runs the usage report THEN system SHALL show, per week: accounts created, accounts active, accounts that came back after their first week, and accounts active on two or more devices. It SHALL show counts only, never names or emails
- [ ] AC-028: WHEN a learner has opted out of usage counts in Settings THEN system SHALL leave them out of these counts too

### P3: Copy and tour reflect sign-in

- As a learner, I want the app's wording to match how it works, so that nothing promises "no account needed"
- **Why P3:** Polish; it doesn't block any behaviour

**Acceptance Criteria:**

- [ ] AC-029: WHEN any page, the site description or Settings mentions accounts THEN system SHALL no longer say "Không cần tài khoản"; the home hero note SHALL say the app is free and uses a Google sign-in
- [ ] AC-030: WHEN the first-visit tour reaches a locked area for a guest THEN system SHALL say that area needs sign-in

## Edge Cases

- WHEN the Google account has no picture or no name THEN system SHALL show initials or the email's first part in the corner, and the nickname elsewhere
- WHEN two devices both hold guest progress and sign in to the same new account one after the other THEN system SHALL merge the second into the first (AC-015), not overwrite it
- WHEN a learner signs out on a shared device and someone else signs in THEN system SHALL start from that person's account only; nothing from the previous learner remains
- WHEN a guest on a device that held another account's progress signs in THEN that progress SHALL already be gone (removed at sign-out), so only guest progress moves
- WHEN the account is deleted on one device while another device is signed in THEN the other device SHALL be signed out on its next contact and keep nothing of that account
- WHEN the browser blocks storage (private mode, blocked site data) THEN system SHALL still sign the learner in and load progress from the account, and say that the device can't keep progress offline
- WHEN Google sign-in is unavailable (network, outage) THEN system SHALL say so in Vietnamese and keep guest access working
- WHEN a learner is in the middle of a lesson and the session expires THEN system SHALL let them finish, keep the result on the device, and send it after they sign in again (AC-006)
- WHEN a guest's followed set or placement level differs from the account's THEN system SHALL keep the account's value and tell the learner which one is kept (TBD in design: most recent wins is the default)
- WHEN the service refuses a request because of rate limits THEN system SHALL show the existing "try again" message and keep progress on the device

## Success Criteria

- [ ] A learner goes from a sign-in prompt to signed in and back on the same page in under 30 seconds on a typical phone connection
- [ ] In a migration test on a device with progress from before this feature, every learned word, review date, attendance day, point and hard word is present in the account after first sign-in (zero differences)
- [ ] Two devices signed in to one account show identical progress after both reload
- [ ] Every locked area refuses a guest in the app, and every locked request in AC-013 is refused when called directly (100% in tests)
- [ ] Guests still get the home and vocabulary pages with no extra loading wait compared with today
- [ ] A month at today's traffic stays within the free hosting plan's limits
- [ ] The usage report shows weekly accounts, returning accounts and multi-device accounts

## Open Questions

- None blocking. Two defaults stand without an explicit answer: changes reach other devices the next time they open or reconnect (no live sync), and backup export stays for signed-in learners (decisions.md, Tentative)

## Notes

- Requested by the owner on 2026-11-03. The owner chose: sign-in required, local progress moves into the account at first sign-in, guests limited to vocabulary and the placement test, the daily lesson locked for guests, sync codes retired, and locked areas shown as a preview with a sign-in prompt. Answers on 2026-11-03: sign-in is for learner return, multi-device use and counting learners; sessions last 30 days and renew on activity; guests don't see the top-10 board; sync codes merge for 7 days after release (no one uses them in production today); accounts are kept until deleted. See decisions.md.
- Feature 001 dropped sign-in on 2026-10-26 over hosting-plan limits for signed-in pages. The pages have since become static shells that load data in the browser, so sign-in can be checked by the service alone. Keeping within the free plan is a goal here, and the design must show it holds.
- Storing email, name and picture makes the app subject to Vietnam's personal data rules. The privacy note (AC-025) and deletion (AC-023) are the minimum.

## Baseline

### Current Behavior

- No sign-in exists. Every area (daily lesson, vocabulary, grammar, irregular verbs, review, exercises, hard words, placement test, profile, settings) is open to everyone
- Progress (learned words and review schedule, lessons, streak and attendance, points, hard words, level, followed set, settings) lives only in the browser
- Settings offers a sync code to use the same progress on several devices, and a backup file to export and import
- The home page and site description say "Không cần tài khoản"; the top-right corner shows "Chào …" with the learner's nickname and a profile link
- The top-10 board lists learners by the nickname they chose

### Gaps / Limitations

- Progress is lost when browser data is cleared and there is no backup
- Using two devices needs a sync code, which anyone holding it can read and change
- The owner has no way to know a returning learner across devices
