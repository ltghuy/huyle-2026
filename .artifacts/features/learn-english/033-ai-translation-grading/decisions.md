---
id: 033
feature: ai-translation-grading
created: 2026-11-09
---

# Decisions: AI grading for "Dịch câu" with the learner's own key

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### AI at runtime, revisited

- **Question:** Feature 001 decided on no AI in the running app (revised 2026-10-26), and feature 016 kept it. Does this proposal break that rule?
- **Decision:** The app still runs no AI of its own and pays for none. A learner's browser may call Google directly with a key the learner added. The server never sees the key and does no AI work.
- **Rationale:** The 001 rule existed to avoid running cost, rate limits and a bot check. A learner-owned key has none of those costs for the app, and the Worker's CPU and request budget is untouched.
- **Caveats:** It does add a third party that receives learner text (the sentence and the answer), so the privacy page must say so (AC-020).

### Where AI grading applies

- **Question:** The Arena grades "Dịch câu" answers too. Use AI there?
- **Decision:** No. Daily lessons, Ôn tập and the exercise library only. The Arena keeps matching.
- **Rationale:** One player may have a key and the other not, so verdicts would differ between them. A 1 to 3 second AI call would also eat into the question timer.

### What an AI "correct" means

- **Question:** When the AI accepts a non-matching answer, how is it rated and what happens to the wording?
- **Decision:** A normal correct answer (not hard). The wording goes to the existing claim queue in the background, marked as accepted by AI, so the owner can approve it for every learner.
- **Rationale:** Rating it hard, as a manual claim is, would undo most of the benefit. Sending it to the queue keeps the owner's approval of everything other learners see and grows the accepted answers for learners without a key.
- **Caveats:** A rejected AI-accepted wording triggers the same one-time notice as a manual claim.

### What an AI "wrong" shows

- **Question:** On a wrong AI verdict, explain it, and keep the claim action?
- **Decision:** Show a short Vietnamese explanation (one or two sentences) next to today's wrong result, and keep "my answer is also correct".
- **Rationale:** The explanation is what a learner gets from AI that matching can't give. The AI can still be wrong, so the claim stays.

### Where keys are managed

- **Question:** The proposal says the "Personal" profile. Hồ sơ or Cài đặt?
- **Decision:** Cài đặt, in a "Chấm điểm bằng AI" section.
- **Rationale:** Keys are a per-device setting that never syncs. Hồ sơ holds what follows the learner across devices and accounts.

## Tentative

### When a refused key is tried again

- **Question:** After a quota refusal, when does the app try that key again?
- **Tentative Decision:** When Google's refusal names a daily quota, wait until midnight Pacific time, when Google resets free daily quotas. When it names a per-minute quota, or doesn't say, skip the key for the delay Google suggests (about a minute if none) and keep its status as working.
- **Revisit when:** The 429 details turn out to look different from the community reports the research relied on (Google doesn't document their shape).

### Keys on sign-out

- **Question:** Keys belong to a person but live on a device. What happens when the learner signs out or deletes their account?
- **Decision:** They are removed with the progress, like the other device-only notes of that learner.
- **Rationale:** Sign-out already clears the device so the next learner starts clean (feature 022). Leaving a stranger's key behind would let the next person use their quota.

### How long to wait for a verdict

- **Question:** How long can a learner wait on "Đang chấm…" before the app falls back to matching?
- **Tentative Decision:** About 8 seconds across all keys tried for one answer.
- **Revisit when:** Real verdicts are routinely slower or faster than that.

### How many keys

- **Question:** Is there a limit on the number of keys?
- **Tentative Decision:** Up to 5.
- **Revisit when:** Learners ask for more.

### Which model

- **Question:** Which Google model grades answers?
- **Tentative Decision:** The cheapest fast model on Google AI Studio's free tier, chosen and checked against Google's current docs during design. It is not learner-selectable.
- **Revisit when:** The free tier drops that model or its verdicts are poor.
