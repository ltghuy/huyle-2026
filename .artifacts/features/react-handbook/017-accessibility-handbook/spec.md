---
id: "017"
feature: accessibility-handbook
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-08
---

# Feature: Accessibility Handbook

## Overview

The Performance & Accessibility folder lists an **Accessibility** page that
only says "coming soon". Learners have nowhere to study accessibility beyond
practice 8 (the accessible modal). This feature writes that page: a short
handbook based on web.dev's *Learn Accessibility* course, covering the 13
"Content design" modules (ARIA and HTML, content structure, the document,
keyboard focus, JavaScript, images, color and contrast, animation and motion,
typography, video and audio, forms, patterns and design systems, design and
user experience). It keeps only each module's main ideas and shows them with
small live demos, in the same shape as the Performance page.

## Goals

- [x] The Accessibility page can be opened in one click from the sidebar, the home page and the section page, and the folder shows both of its pages as written.
- [x] Each topic fits on one screen of reading (an intro, a few key points, one or two Do / Avoid pairs) and has a demo whose result changes visibly when the learner flips the setting it teaches.
- [x] Every one of the 13 content-design modules is covered by at least its main points and links to that module.
- [x] What a demo says assistive technology "sees" is read from the demo's real page content at that moment; anything that is a simplification of a real screen reader is labelled as such.

## Out of Scope

| Feature | Reason |
|---------|--------|
| The course's testing modules (automated, manual, assistive technology) in depth | Not in the requested list; the last topic mentions testing in one point and links them |
| A real screen reader inside the page | Not possible from a web page; demos show a simplified reading of the page content and say so |
| Each module in full depth, WCAG success criteria one by one | The user asked for main concepts; the page links to each module |
| Changes to the Performance page's content | Already done in feature 016 |

## User Stories

### P1: Reach the Accessibility page

- As a learner, I want the Accessibility page in the Performance & Accessibility folder to be written so that I can study it next to the Performance page.
- **Why P1:** Nothing else is reachable without it.
- **Independent Test:** Open it from the sidebar, home and section page; refresh its address.

**Acceptance Criteria:**

- [x] AC-001: WHEN the sidebar, the section page or the home page is shown THEN Accessibility SHALL no longer be marked coming soon, and the section SHALL count 2 of 2 pages written.
- [x] AC-002: WHEN the Accessibility page is opened directly or refreshed THEN system SHALL show breadcrumbs (Handbook › Performance & Accessibility › Accessibility), the title, a one-paragraph intro, a list of its topics that jumps to each, and a credit linking to web.dev's *Learn Accessibility*.

### P1: Semantics and ARIA

- As a learner, I want to compare a clickable div, a div patched with ARIA and a real button so that I see why native HTML comes first.

**Acceptance Criteria:**

- [x] AC-003: WHEN the semantics demo is shown THEN system SHALL show three versions of the same control and, for each, what assistive technology gets (role, name, whether it can be reached with Tab), read from the control itself, plus how many times it was activated by pointer and by keyboard; only the patched div and the button SHALL respond to Enter and Space.

### P1: Structure and the document

- As a learner, I want to see two pages that look the same but are built differently, and what a screen reader can navigate in each, so that I understand landmarks and headings.

**Acceptance Criteria:**

- [x] AC-004: WHEN the learner switches the sample page between generic boxes and meaningful HTML THEN the sample SHALL look the same, and the outline next to it (landmarks and headings, as read from the sample) SHALL change; problems SHALL be listed in words (no landmarks, a skipped heading level, no main heading).

### P1: Keyboard focus

- As a learner, I want to tab through a small page and see the order focus visits, and how a skip link, a positive tab index or a removed focus outline change it.

**Acceptance Criteria:**

- [x] AC-005: WHEN the learner moves focus through the focus demo THEN system SHALL list the visited elements in order; WHEN they turn on a positive tab index for one element THEN the computed tab order SHALL put that element first (before everything else on the page) and Tab SHALL skip it where it sits visually; WHEN they hide the focus outline THEN the focused element SHALL show no visible indicator while the demo says where focus is; a skip link SHALL move focus past the navigation.

### P2: JavaScript and dynamic content

- As a learner, I want to see which updates a screen reader hears so that I know when to use a live region and state attributes.

**Acceptance Criteria:**

- [x] AC-006: WHEN the learner adds an item to the cart with announcements on THEN the demo's announcement log SHALL show the message the page announced; with them off, the count SHALL change on screen but the log SHALL show that nothing was announced; WHEN they open and close a disclosure THEN the log SHALL show its name and expanded or collapsed state. The log SHALL be labelled as a simplified screen reader.

### P2: Images, video and audio

- As a learner, I want feedback on the alt text I write for an image in different uses, and to know which alternatives a video or audio file needs.

**Acceptance Criteria:**

- [x] AC-007: WHEN the learner types alt text for the sample image and picks how the image is used (informative, decorative, or as a link) THEN system SHALL show what a screen reader would read and give feedback in words: an empty alt only suits decorative use, "image of" is redundant, over about 150 characters needs a longer description, a file name is not a description, and a link describes its destination.
- [x] AC-008: WHEN the learner picks a media type (audio only, video only, video with sound) and whether it is live or recorded THEN system SHALL list the alternatives it needs (captions, transcript, audio description), marking what is required for WCAG AA and what is recommended.

### P2: Color and contrast

- As a learner, I want to pick text and background colors and see the contrast ratio and whether it passes, and see why color alone can't carry meaning.

**Acceptance Criteria:**

- [x] AC-009: WHEN the learner picks a text and background color or a preset THEN system SHALL show the contrast ratio and pass or fail, in words, for normal text (4.5:1), large text (3:1), the enhanced level (7:1) and interface parts (3:1), with a preview of both text sizes.
- [x] AC-010: WHEN the learner turns on grayscale THEN a sample error shown by color only SHALL become impossible to spot, while the one shown with an icon and text SHALL stay clear.

### P2: Typography

- As a learner, I want to apply larger text and wider spacing to a card and see whether it still fits, so that I understand why text must be able to grow.

**Acceptance Criteria:**

- [x] AC-011: WHEN the learner turns on text at 200% or the WCAG text-spacing values (line height 1.5, paragraph spacing 2×, letter spacing 0.12em, word spacing 0.16em) THEN two cards SHALL apply them; the fixed-height card SHALL report, as measured, that its text is cut off, and the card that grows SHALL report that all text is visible. Justified text SHALL be shown as a toggle with its problem in words.

### P2: Animation and motion

- As a learner, I want to see my own reduced-motion setting and an animation that respects it and can be paused.

**Acceptance Criteria:**

- [x] AC-012: WHEN the motion demo is shown THEN system SHALL say whether the learner's system asks for reduced motion; the moving banner SHALL have a pause control, SHALL show how long it has been moving (and that over 5 seconds needs a pause control), and SHALL switch to a non-moving version when reduced motion is asked for, either by the system or by a demo toggle.

### P2: Forms

- As a learner, I want to compare an inaccessible and an accessible version of the same form, and hear what each field announces.

**Acceptance Criteria:**

- [x] AC-013: WHEN the learner switches between the two versions of the form THEN the inaccessible one SHALL use placeholder-only labels and color-only errors, and the accessible one SHALL use visible labels, hints, grouped options with a legend, and text errors linked to their fields; WHEN a field gets focus THEN the demo SHALL show what it announces (name, role, required, invalid, hint), read from the field.
- [x] AC-014: WHEN the learner submits the accessible version with errors THEN system SHALL show an error summary that receives focus and links to each field, and each field SHALL say what is wrong in text.

### P3: Patterns, design systems and design

- As a learner, I want to see accessibility annotations on a small design so that I understand what a designer hands to developers.

**Acceptance Criteria:**

- [x] AC-015: WHEN the learner turns on annotations for the sample component THEN system SHALL mark its landmarks, headings, focus order and the accessible name of each control, and list them in a table read from the component itself.

### P3: Short notes

**Acceptance Criteria:**

- [x] AC-016: WHEN a topic is shown THEN system SHALL show at most about six key points and one or two "Do / Avoid" pairs, with links to the matching web.dev modules; every one of the 13 content-design modules SHALL be linked.
- [x] AC-017: WHEN the page is read THEN its notes SHALL cover, besides the demos: the five rules of ARIA; page title and language (and language of parts) and iframe titles; focus management in single-page apps and dialogs (linking practice 8); captions vs subtitles and transcripts; flashing limits; inclusive design principles, personas and testing with people.

## Edge Cases

- WHEN the learner's system asks for reduced motion THEN no demo SHALL animate by default.
- WHEN the screen is 360 px wide THEN the page SHALL not scroll sideways.
- WHEN the learner types very long alt text or picks extreme colors THEN the demo SHALL keep its layout and still report the result.
- WHEN a form field is focused in the inaccessible version THEN the announcement SHALL show what that version really exposes (for example a name that comes only from the placeholder).
- WHEN JavaScript hasn't loaded yet THEN the notes SHALL still be readable.

## Success Criteria

- [x] Every demo reacts to its control: the div is skipped by Tab while the button isn't; the outline lists landmarks only for the meaningful version; a positive tab index changes the visiting order; the log announces only with the live region on; feedback changes with the alt text; the contrast verdict flips at 4.5:1; the fixed card reports clipped text; the banner stops under reduced motion; the error summary takes focus.
- [x] The whole page reads in about fifteen minutes (under ~2,000 words of prose outside the demos).
- [x] 0 serious or critical axe issues on the page in light and dark themes (except where a demo shows a broken version on purpose, which is marked as such); no sideways scroll at 360 px.

## Open Questions

- None. Defaults chosen without asking are in decisions.md.

## Notes

Source: web.dev *Learn Accessibility*, content-design modules (ARIA and HTML,
content structure, the document, keyboard focus, JavaScript, images, color and
contrast, animation and motion, typography, video and audio, forms, patterns,
components and design systems, design and user experience).

Thresholds: text contrast 4.5:1 (large text 3:1, enhanced 7:1), interface
parts and focus indicators 3:1; no more than three flashes per second; moving
content over 5 seconds needs a pause; alt text about 150 characters at most.

## Baseline

### Current Behavior

- The Accessibility page shows a "coming soon" placeholder that points to practice 8, and the sidebar, section page and home card count it as not written.

### Gaps / Limitations

- No accessibility notes in the handbook beyond the accessible modal practice.
