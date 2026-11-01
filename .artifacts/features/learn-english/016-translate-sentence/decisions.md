---
id: 016
feature: translate-sentence
created: 2026-11-01
---

# Decisions: Translate a sentence into English

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### Where the prompts come from

- **Question:** Write new prompts for this exercise, or reuse the course's reviewed sentences?
- **Decision:** Reuse the reviewed sentences (about 16,000 across A1 to C1 and the vocabulary sets). The learner sees the Vietnamese and types the English. The sentence's English, its other accepted word orders and any approved wordings count as correct.
- **Rationale:** They already cover every level, grammar point and set, and each has a reviewed Vietnamese translation, audio and links to its words and grammar. The feature can ship without a new drafting and review batch.
- **Caveats:** Some Vietnamese translations allow several natural English wordings, so early on more answers will be claimed. The claim queue exists for exactly this, and each approval cuts later claims. Dedicated short prompts can come later as their own feature.

### Who verifies a claim

- **Question:** When a learner says their different wording is correct, who decides?
- **Decision:** Claims wait in a queue on the server. The owner runs a script on their own machine that fetches them, has Claude suggest a verdict and a reason for each, and then decides each one in the review sheet. Approved wordings become accepted answers through the normal content publish.
- **Rationale:** Keeps the rule of no AI at runtime and the owner's approval of everything learners see. It also follows the content pipeline the owner already uses (draft, review, publish).
- **Caveats:** Claims are only decided when the owner runs the script. That's fine because the learner isn't waiting (see next decision).

### What the learner's result is while a claim waits

- **Question:** Count a claimed answer as correct now, or wait for the decision?
- **Decision:** Count it as correct now, rated hard (as a hinted answer is). If the owner rejects it later, the learner sees a one-time notice with the reference sentence and the owner's explanation, and the related words and grammar point come forward for review.
- **Rationale:** The session stays uninterrupted, as the owner asked, and a wrong claim still gets corrected.
- **Caveats:** Needs an anonymous way for a device to ask about its own claims (see tentative decisions). Approvals change nothing for the learner.

### Where it appears

- **Question:** Which parts of the app use the exercise?
- **Decision:** All three: the daily lesson's sentence tasks, Ôn tập for words and grammar points that have a reviewed example sentence, and the exercise library.
- **Rationale:** Owner's choice.

## Tentative

Decisions marked as tentative: revisit if assumptions change.

### How answers are compared

- **Question:** How forgiving is the automatic check?
- **Tentative Decision:** Ignore letter case, punctuation, extra spaces, curly versus straight apostrophes, and contraction versus full form ("don't" and "do not", "I'm" and "I am"). Nothing else: no typo tolerance and no synonyms. A near miss goes to the claim action instead.
- **Revisit when:** Claims show many approvals for the same kind of difference (e.g. "3" and "three"), which would be cheaper to forgive automatically.

### How a device follows its claims

- **Question:** How does the app learn that a claim was rejected, without accounts?
- **Tentative Decision:** Each claim gets a random reference created on the device. The device keeps its waiting references and asks about them now and then (at most once a day, when the app opens), and the server answers only for the references it is asked about. Waiting references are part of the device's saved data, so backups and sync carry them.
- **Revisit when:** Learners report notices not arriving, or the check becomes a noticeable share of server requests.

### Limits and retention

- **Question:** How many claims may a device send, and how long does the server keep them?
- **Tentative Decision:** At most 30 claims per device per day. An answer is refused when it is empty or more than 3 times the reference sentence's length (and never over 500 characters). Decided claims are kept for 90 days so a device that is away for a while still hears back, then deleted. Undecided claims are kept until decided.
- **Revisit when:** The queue grows faster than the owner can review it, or abuse shows up.

### Effect of a claim on the score

- **Tentative Decision:** A claimed answer counts toward points and streaks like any correct answer. A later rejection doesn't take points back; it only brings the reviews forward.
- **Revisit when:** Claims are used to farm points on the leaderboard.
