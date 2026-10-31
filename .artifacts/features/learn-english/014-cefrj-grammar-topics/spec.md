---
id: 014
feature: cefrj-grammar-topics
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-31
---

# Feature: More grammar topics from the CEFR-J Grammar Profile

## Overview

The course has 44 grammar lessons (A1 12, A2 11, B1 9, B2 7, C1 5). Compared with the CEFR-J Grammar Profile (ver. 20180315, free to use with citation), many everyday points have no lesson: object pronouns, conjunctions, polite requests, tag questions, indirect questions, modal perfects, the subjunctive and others. Learners who meet these in the sentence exercises have nowhere to read about them. The owner chose to add all 28 missing points (2026-10-31).

## Goals

- [x] 28 new grammar lessons, each in the same shape as the current ones, exist as drafts for the owner to review
- [x] Once approved and published, /grammar lists 72 topics in teaching order within each level, and the new topics appear in daily lessons and in the /exercises grammar sets

## Out of Scope

| Feature | Reason |
|---------|--------|
| New pages, routes or exercise types | The grammar page, lessons and exercise library already handle any number of topics |
| C2 items of the profile | The course stops at C1 |
| Rewriting the 44 existing lessons | Only their place in the order changes |
| Generating audio before approval | Audio is generated for approved sentences only, as with every other content batch |

## User Stories

### P1: Read and practise the missing grammar points

- As a learner, I want a lesson for each common grammar point at my level so that I can look up what I meet in exercises.
- **Why P1:** it's the whole feature.
- **Independent Test:** after publishing, open /grammar at each level and open a new topic; its lesson and its practice set work.

**Acceptance Criteria:**

- [x] AC-001: WHEN the drafts are imported THEN there SHALL be 28 new grammar items with status "draft", one per topic in the table below, each with a Vietnamese rule, one pattern per existing form, 2–5 usage points, signal words, 2–4 common mistakes, 4 example sentences and 6 practice items (4 with exactly 4 options, 2 typed)
- [x] AC-002: WHEN the drafts are imported THEN each example sentence SHALL pass the course's sentence rules (length limit per level, Vietnamese translation, gap words, exactly 3 wrong variants with Vietnamese explanations) and be linked to its grammar topic
- [x] AC-003: WHEN a learner opens /grammar THEN each level SHALL list its old and new topics in teaching order (new topics placed among the existing ones, not appended), and the same order SHALL be used by the daily lesson
- [x] AC-004: WHEN a new topic is approved and published THEN it SHALL appear on /grammar, in daily lessons and as a "Điền vào chỗ trống" set in /exercises with no code change
- [x] AC-005: WHEN a topic is not approved yet THEN learners SHALL see it as "Sắp có" on /grammar and it SHALL NOT appear in lessons or exercises

### P2: Credit the source

- As the owner, I want the CEFR-J Grammar Profile credited so that the licence terms are met.
- **Why P2:** the licence asks for a citation.

**Acceptance Criteria:**

- [x] AC-006: WHEN a learner opens /credits THEN the CEFR-J Grammar Profile SHALL be cited next to the vocabulary profile

## New topics

| Level | Topic | CEFR-J items |
|-------|-------|--------------|
| A1 | Subject and object pronouns (I/me, he/him…) | PPO |
| A1 | Conjunctions: and, but, or, so, because | CC, CL_after.etc |
| A2 | Polite requests and offers | INTF.* |
| A2 | Linking verbs + adjective | VP.SVC |
| A2 | Time clauses: when, before, after, until | CL.when, CL_after.etc |
| A2 | As … as | COMP.EQ.as_as |
| A2 | Indefinite pronouns | PIND.nobody.anything.etc |
| A2 | Verbs with two objects | VP.SVOO, VP.SVOtoO |
| A2 | make / let / have + object + verb | CAUS.have.let.make |
| B1 | Possessive and reflexive pronouns, each other | PPOS, PREFL, PREF.each_other |
| B1 | Tag questions | TAG.AFF |
| B1 | Indirect questions | INDQ.*, CL.WH.OBJ |
| B1 | Contrast: although, despite, however | CL_after.etc |
| B1 | Purpose: to, in order to, so that | TO.in_order_to_do, CL.so_that |
| B1 | So / such … that | RBDEG.so_JJ.RB_that, RBDEG.such_JJ |
| B1 | May, might, could, be able to | MD.may, MD.might, MD.be_able_to |
| B1 | ask / tell + object + to V | CAUS.ask.tell_NP_to_do, INDSP.tell |
| B2 | Modal perfects: should have, could have, needn't have | MD.MD_PF |
| B2 | Passive in other tenses and with modals | PASS.PRSPF, PASS.PRSPRG, PASS.MD… |
| B2 | The more …, the more … | COMP.the_the |
| B2 | So do I / Neither do I | INV.so_V_NP, INV.neither |
| B2 | Whoever, whatever, wherever | WH.-ever |
| B2 | As if / as though | SUBJ.as_if.though_PAST |
| B2 | Relative clauses: whose, whom, preposition + which | PRELGEN, PRELO.whom, PREL.PREP_PREL, PREL.NR |
| B2 | Emphatic do | V.INT.do_does |
| C1 | The subjunctive after suggest, insist, recommend | SUBJ.PRS |
| C1 | Inverted conditionals: Were I…, Had I…, Should you… | SUBJ.INV.* |
| C1 | Perfect and passive infinitives and gerunds | TO.to_have_done, TO.to_be_done, VG.having_VN, VG.being_VN |

## Edge Cases

- WHEN a learner has already studied every grammar topic of their level THEN the new topics of that level SHALL be offered next, like any topic not yet studied
- WHEN a draft breaks a drafting rule THEN the import check SHALL reject it and nothing SHALL be merged
- WHEN an example sentence repeats one already in the course THEN it SHALL be rewritten so example ids and audio stay unique

## Success Criteria

- [x] All 28 drafts pass the import check on the first merged import
- [x] After approval and publish, /grammar shows 72 topics and the live content version increases by one

## Open Questions

- None

## Notes

Topics were chosen by grouping the 262 main items of the profile and removing those the 44 current lessons already teach. The level of each topic follows the profile where it gives one, adjusted to where Vietnamese course books usually teach the point.

## Baseline

### Current Behavior

- /grammar lists 44 topics; each opens a lesson with a rule, patterns, usage, mistakes, examples and 6 practice questions.
- Daily lessons introduce grammar topics of the learner's level in a fixed order.

### Gaps / Limitations

- Common grammar points such as object pronouns, tag questions and the subjunctive have no lesson.

## Evidence (2026-10-31)

- Import check: 28 files, 140 items, 0 problems; no duplicate or existing example sentence. Existing items changed only in `sort`.
- Before approval, a remote publish dry run skipped the 140 drafts (AC-005).
- The owner approved all 140 items; 112 Kokoro clips (am_adam) were generated and deployed.
- Content version 12 → 13: the content API serves 72 grammar topics (A1 14, A2 18, B1 17, B2 15, C1 8), and a new clip plays from the sentences audio Worker.
- App redeployed (version f67c12f0): the /grammar bundle has the new teaching order, and /credits cites the Grammar Profile.
