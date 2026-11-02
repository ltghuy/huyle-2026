---
slug: word-dialog-prev-next
completed: 2026-11-02
---

# Summary: Previous / next word in the vocabulary dialog

## What Changed

`WordDialog` takes an optional `nav` (position, total, previous and next ids) and `onNavigate`. It shows a "Chuyển từ" group next to "Đóng": a left arrow ("Từ trước"), the position, and a right arrow ("Từ tiếp theo"). Each arrow is disabled at its end of the list. ← and → inside the dialog do the same when no modifier key is held. Each new word scrolls the dialog back to the top and remounts the details, so a pending "Đánh dấu đã học" doesn't carry over.

`VocabularyBrowser` builds the sequence from the list on screen: the level's words for the chosen topic, or the open set's words. With "Chỉ hiện từ chưa học" on, the sequence holds the unlearned words plus the open one, so marking a word learned doesn't lose your place. Moving replaces `?word=` in the URL instead of pushing, so "Đóng" and the browser's back button still return to the list in one step. A word that isn't in the list on screen (from search, another level, or a link) gets no arrows.

Checked in the browser: A1 shows "1/1164", → twice reaches "about" (3/1164), and "Đóng" returns to `?level=A1`.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/vocabulary/word-dialog.tsx` | `WordNav`, `WordNavButtons`, arrow keys, scroll to top on a new word |
| `apps/learn-english/src/components/vocabulary/vocabulary-browser.tsx` | `wordNav()` over the list on screen; `handleNavigateWord` replaces `?word=` |
| `apps/learn-english/src/components/vocabulary/vocabulary-browser.test.tsx` | Arrows, keys, the disabled ends, and no arrows for a word outside the list |
