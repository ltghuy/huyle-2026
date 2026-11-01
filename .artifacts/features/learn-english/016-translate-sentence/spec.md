---
id: 016
feature: translate-sentence
type: brownfield
scope: large
status: done
branch: main
created: 2026-11-01
---

# Feature: Translate a sentence into English

## Overview

Every sentence exercise today gives the learner the English words in some form: tiles to arrange, options to choose from, a gap to fill or audio to copy down. None asks them to produce a whole English sentence from the Vietnamese alone, which is the skill they need when they speak or write. The owner asked on 2026-11-01 for an exercise where the learner reads a short Vietnamese sentence and types its English translation.

A sentence can usually be translated more than one way ("Close your eyes and imagine the sea." / "Shut your eyes and picture the sea."). The course can't list every wording in advance, and there is no AI in the app to judge answers on the spot. So when the learner's wording isn't one of the accepted answers, they can say it is also correct and keep going. Their answer goes into a queue that the owner checks later, and an approved wording is accepted for everyone from then on.

The exercise uses the course's existing reviewed sentences (all levels, every grammar point and every vocabulary set) as prompts, so no new content has to be written before it ships.

## Goals

- [x] Learners can practise typing an English translation of a Vietnamese sentence in daily lessons, in Ôn tập and in the exercise library, at every level from A1 to C1
- [x] A learner whose different wording is right can finish the exercise as correct in one tap, without waiting or leaving the session
- [x] Every claimed wording reaches the owner for a decision, and approved wordings are accepted for all learners after the next content publish
- [x] The app still uses no AI while a learner studies, and stays within the free hosting plan

## Out of Scope

| Feature | Reason |
|---------|--------|
| Judging free answers with AI while the learner studies | The app has no AI at runtime; claims are judged later, outside the app |
| Partial credit or highlighting which words were wrong | The answer is right or wrong as a whole, like dictation; word-level diffs are a separate feature |
| Writing new prompt sentences for this exercise | It reuses the reviewed sentences; dedicated prompts can be a later feature |
| English → Vietnamese translation | Only Vietnamese → English was asked for |
| Learner accounts, or showing a learner the history of everything they submitted | The app stays account-free; only the outcome of a rejected claim is shown, once |
| Speaking the answer | Typing only |

## User Stories

### P1: Translate a sentence

- As a learner, I want to read a Vietnamese sentence and type it in English so that I practise building sentences myself, the way I will have to when I speak or write
- **Why P1:** It is the exercise itself
- **Independent Test:** Open the exercise library, pick the new type for an A1 topic, type a correct and a wrong translation, and check both results

**Acceptance Criteria:**

- [x] AC-001: WHEN the exercise opens THEN system SHALL show an instruction, the Vietnamese sentence and an English text box, with no English words of the answer visible
- [x] AC-002: WHEN the learner checks an answer that matches an accepted English wording of the sentence THEN system SHALL mark it correct, ignoring letter case, punctuation, extra spaces, and the difference between a contraction and its full form ("don't" and "do not")
- [x] AC-003: WHEN the learner's answer matches no accepted wording THEN system SHALL mark it wrong and show their answer, the reference sentence, its Vietnamese translation, a play button and, when the sentence belongs to a grammar point, a link to that point
- [x] AC-004: WHEN the learner checks an answer THEN system SHALL accept as correct any wording the owner approved for that sentence and published, in addition to the sentence's own English and its other accepted word orders
- [x] AC-005: WHEN a learner answers this exercise THEN system SHALL record the attempt and update the review schedule of the sentence's words and grammar point the same way other sentence exercises do

### P1: Say a different wording is correct

- As a learner, I want to mark my answer as correct when it means the same thing in different words so that a fair answer isn't counted against me and my session isn't interrupted
- **Why P1:** Without it, any second correct wording counts as a mistake, which makes the exercise feel unfair
- **Independent Test:** Answer with a valid alternative wording, mark it as correct, and confirm the session moves on and the claim is waiting for the owner

**Acceptance Criteria:**

- [x] AC-006: WHEN an answer is marked wrong THEN system SHALL offer a "my answer is also correct" action next to the result, before the learner moves on
- [x] AC-007: WHEN the learner uses that action THEN system SHALL count the answer as correct but hard (the same rating as a hinted answer), let the learner continue at once, and send the claim in the background
- [x] AC-008: WHEN a claim can't be sent (offline, server error) THEN system SHALL keep it on the device and send it again later, without asking the learner to do anything
- [x] AC-009: WHEN a learner sends a claim THEN system SHALL send only the sentence, the learner's answer and an anonymous claim reference: no name, sync code or other personal data
- [x] AC-010: WHEN the same device sends more claims in one day than a fair daily limit, or an answer that is empty or far longer than the sentence THEN system SHALL refuse it quietly, without interrupting the learner

### P1: The owner decides on claims

- As the owner, I want to see every claimed wording with the sentence it belongs to, already pre-judged, and approve or reject it so that the accepted answers grow and wrong claims don't stand
- **Why P1:** Without a decision step, claims pile up and the accepted answers never grow
- **Independent Test:** Submit a claim from the app, run the claim review on the owner's machine, approve it, publish, and check that the same wording is now marked correct straight away

**Acceptance Criteria:**

- [x] AC-011: WHEN the owner runs the claim review THEN system SHALL fetch the waiting claims, group identical wordings of the same sentence, and give each one a suggested verdict with a short reason, judged on the owner's machine
- [x] AC-012: WHEN the owner approves a wording THEN system SHALL add it to the sentence's accepted wordings, so that after the next content publish every learner's matching answer is marked correct at once
- [x] AC-013: WHEN the owner rejects a wording THEN system SHALL record the decision with a short Vietnamese explanation for the learner
- [x] AC-014: WHEN the owner has decided a claim THEN system SHALL never offer it for review again

### P2: Hear back about a rejected claim

- As a learner, I want to know when an answer I said was correct turned out not to be so that I learn the right wording instead of keeping the mistake
- **Why P2:** Claims count as correct right away; without this, a wrong claim teaches the wrong thing for good
- **Independent Test:** Submit a claim, reject it in the claim review, reopen the app and check the notice and the reviews it brings forward

**Acceptance Criteria:**

- [x] AC-015: WHEN the learner opens the app after one of their claims was rejected THEN system SHALL show, once, their answer, the reference sentence and the owner's explanation
- [x] AC-016: WHEN a rejected claim is shown THEN system SHALL bring the sentence's related words and grammar point forward for review, as after a wrong answer
- [x] AC-017: WHEN a claim is approved THEN system SHALL change nothing in the learner's progress and show no notice

### P2: Find it everywhere

- As a learner, I want this exercise in my daily lesson, in Ôn tập and in the exercise library so that I practise it with the rest of my study

**Acceptance Criteria:**

- [x] AC-018: WHEN a daily lesson picks a sentence task THEN system SHALL include translating the sentence among the kinds it picks from at random
- [x] AC-019: WHEN Ôn tập reviews a word or grammar point that has a reviewed example sentence THEN system SHALL sometimes ask the learner to translate that sentence
- [x] AC-020: WHEN a learner opens the exercise library THEN system SHALL offer the new type with sets per level and topic, like the other sentence exercises

## Edge Cases

- WHEN the learner checks an empty answer THEN system SHALL keep the check button disabled
- WHEN the learner types non-English text or numbers written as words or digits ("3" and "three") THEN system SHALL compare the text as typed: only case, punctuation, spacing and contractions are forgiven
- WHEN the learner claims the same wording for the same sentence twice THEN system SHALL send it once
- WHEN a claim is already decided by the time it is sent (another learner claimed the same wording and it was approved and published) THEN system SHALL treat it as approved
- WHEN a sentence is removed from the course before its claims are decided THEN system SHALL drop those claims and show no notice for them
- WHEN the learner restores progress on another device THEN system SHALL carry over unsent claims and claims still waiting for a decision, so a later rejection still reaches them
- WHEN a claim stays undecided for a long time THEN system SHALL keep the answer counted as correct and keep waiting, with no notice
- WHEN the exercise opens and the sentence's audio can't play THEN system SHALL still allow the exercise; audio is only on the result

## Success Criteria

- [x] A learner can answer a translation exercise and, on a wrong result, claim it in a single tap, with no wait before the next step
- [x] An approved wording is marked correct for any learner straight after the next content publish
- [x] No request made while studying calls an AI model, and claim requests stay within the free plan limits
- [x] Typecheck, lint, unit tests, build and the end-to-end flow (answer, claim, review, publish, accepted) pass

## Open Questions

- None blocking. Tentative choices (the daily claim limit, how long decided claims are kept on the server, how often the app asks about pending claims) are in decisions.md

## Notes

- Verified 2026-11-01: 872 unit tests, typecheck, lint, build, 18 e2e tests (translate spec: claim flow and a published wording accepted). `content:claims pull --no-ai` and `apply` were run once against the local D1 (a rejected claim got its status, explanation and decision time); the Claude pre-judging call and the `--remote` path have not been run yet.

- Decisions taken with the owner on 2026-11-01: reuse the existing reviewed sentences as prompts; claims are pre-judged by a script on the owner's machine and decided by the owner; a claim counts as correct now and a rejection follows up later; the exercise appears in the daily lesson, Ôn tập and the exercise library. See decisions.md.
- Related: feature 001 (AC-033, AC-034 sentence tasks), feature 010 (dictation, which also compares typed sentences), feature 015 (sentence kinds after the tile merge).

## Baseline

### Current Behavior

- Daily lessons pick sentence tasks from: put words in order, fill in the missing word, choose the correct sentence, dictation and find the error
- Ôn tập reviews words with meaning choice, missing letters, listening and recall, and grammar points with a fill-in-the-blank
- The only free-typing sentence exercise is dictation, where the learner hears the English and copies it down; free writing is checked by the learner against model answers and never sent anywhere
- The app sends the server only anonymous counts, sync data and leaderboard entries; nothing the learner types is sent

### Gaps / Limitations

- Learners never have to produce an English sentence from Vietnamese alone
- There is no way for learner answers to improve the accepted answers of the course
