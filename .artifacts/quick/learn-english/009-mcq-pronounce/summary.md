---
slug: mcq-pronounce
completed: 2026-10-27
---

# Summary: Say the word after a right answer (multiple choice, missing letters, recall)

## What Changed

`McqInstance` now carries the target word's `audio` key. When the result is right, `McqView` calls `playClipOnce("word", audio, 450)`, which builds the `Audio` at once, so the clip downloads while the chime plays, and starts it after the delay. The function returns a cleanup that clears the timer and pauses, so moving on stops it. It respects the answer-sound switch, whose description now says it also reads the word. Checked in Chromium on `/exercises`: each right answer requested its clip once (about 45 ms after the check), and wrong answers requested none.

## Files Modified

| File | Change |
|------|--------|
| `src/learning/exercises/mcq.ts` | `audio` on the instance |
| `src/components/exercise/audio-button.tsx` | `playClipOnce(source, key, delayMs)` |
| `src/components/exercise/word-exercises.tsx` | Effect in `McqView` on a right result |
| `src/components/settings/sound-toggle.tsx` | Description mentions reading the word |
| `src/components/exercise/exercise-runner.test.tsx` | Plays once after a right answer; silent after a wrong one and when sounds are off; mock gains `isSoundEnabled` |

## Extension (same day)

The owner asked for the same in "Điền chữ còn thiếu" and "Nhớ lại từ". The effect moved into `usePronounceWhenRight(result, audio)`, used by all three views, and `RecallInstance` gained `audio`. A typo that still counts as right also plays the word. The answer-sound description now says "và đọc từ khi bạn trả lời đúng". Checked in Chromium on a recall set: right answers requested the clip once, the wrong one none. A runner test covers recall and missing letters.

## Patterns Discovered

None.

## Follow-Up

Listening already plays the word; sentence exercises play nothing after answering.
