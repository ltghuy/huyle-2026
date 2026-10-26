---
id: "039"
feature: code-highlighting
type: brownfield
scope: medium
status: done
branch: main
created: 2026-10-21
---

# Feature: Syntax colours for quoted code across the handbook

## Overview

The Testing pages quote a lot of code: the suite's files, step definitions,
sample tests and generated snippets. It shows in one colour, so keywords,
strings, calls and types are hard to tell apart. The reader asked for the
colours they see in their editor.

## Goals

- [x] Code on every handbook and practice page is coloured by kind (keywords, strings, function calls, types and components, properties, comments, punctuation) in light and dark themes. *(Widened on 2026-10-21 from the Testing pages to every section, at the reader's request.)*

## Out of Scope

| Feature | Reason |
|---------|--------|
| Text that isn't code (module graphs drawn as trees, PEM keys, changelogs) | Colouring it would mark words at random; it stays plain |
| An editor-grade highlighter or a full code editor | The pages show short, known files and small edits; a coloured layer under a native text box keeps the pages light |
| A code background that differs from the site's | The block keeps the site's surface so it matches both themes |

## User Stories

### P1: Read code like in an editor

- As a reader, I want quoted code coloured by kind so that I can scan it quickly.
- **Why P1:** It is the request.
- **Independent Test:** Open the Playwright page and look at a quoted spec: keywords, strings and calls have different colours, in both themes.

**Acceptance Criteria:**

- [x] AC-001: WHEN a TypeScript or TSX file or snippet is shown on a Testing page THEN system SHALL colour keywords, strings, function and method calls, types and components, properties, comments and punctuation differently from plain names.
- [x] AC-002: WHEN a YAML, HTML, CSS or JSON snippet is shown THEN system SHALL colour its keys, tags or selectors, values and comments.
- [x] AC-003: WHEN the theme is light or dark THEN every colour SHALL keep at least 4.5:1 contrast with the code background.
- [x] AC-004: WHEN code is coloured THEN line numbers, marked lines, marked ranges (such as a selected syntax-tree node), sizes, scrolling and copying SHALL work as before, and the same code SHALL render identically on the server and in the browser.
- [x] AC-005: WHEN a demo has an editable code box (TypeScript, TSX, CSS, SCSS, HTML or JSON) THEN system SHALL colour the code as it is typed, while typing, selection, scrolling, labels and keyboard use behave like a plain text box. *(Added 2026-10-21 after the reader checked Under the Hood.)*

## Edge Cases

- WHEN a token spans several lines (a comment, a template string) THEN each line SHALL keep its colour.
- WHEN a snippet is built in the browser (a suggested step definition) THEN it SHALL be coloured the same way.

## Success Criteria

- [x] axe reports no contrast problems on any page with code in either theme.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Baseline

### Current Behavior

- Code on the Testing pages is one colour on a muted background, with line numbers and marked lines in the shared code block.

### Gaps / Limitations

- Nothing distinguishes keywords, strings or calls.
