---
id: 029
feature: css-pipeline
type: greenfield
scope: large
status: done
branch: main
created: 2026-10-13
---

# Feature: The CSS pipeline

## Overview

`import "./styles.css"` and a Tailwind class list look like magic: developers
can't say why a page flashes unstyled in development but not in production,
what their Sass becomes, what PostCSS and its plugins actually do, how CSS
Modules stop two `.title` classes from clashing, or how Tailwind ships only
the utilities in use. Page 4 of Under the Hood follows CSS from source to the
browser, after "Bundlers" (028).

## Goals

- [x] Five topics explain the CSS pipeline end to end, each with a working interactive demo
- [x] Where a real tool can run in the browser (PostCSS, Tailwind), the demo uses it on the reader's input; hand-built stand-ins are labelled and checked against the real tool
- [x] The cascade effects (unstyled flash, class collisions) are shown by a real browser rendering them, not by pictures

## Out of Scope

| Feature | Reason |
|---------|--------|
| A complete Sass implementation | A documented subset, checked against Dart Sass |
| Autoprefixer's real browser data | A small labelled table; Autoprefixer is linked |
| CSS-in-JS libraries in depth | Mentioned as a contrast; not part of the build pipeline focus |
| Image, font and other asset handling | Covered by the Performance page |

## User Stories

### P1: See how CSS reaches the page

- As a developer, I want to compare CSS injected by JavaScript with CSS extracted into the page so that I understand the unstyled flash and why production extracts CSS
- **Why P1:** The first thing a bundler does with CSS, and a visible bug
- **Independent Test:** Replay each mode and read whether the first paint was styled

**Acceptance Criteria:**

- [x] AC-001: WHEN the reader replays a delivery mode THEN a real page SHALL load in a frame and system SHALL report, from the browser's paint timing, when it first painted and when its styles applied
- [x] AC-002: WHEN styles are injected after the script loads THEN system SHALL report that unstyled content was painted first; WHEN styles are in the page head THEN the first paint SHALL be styled

### P1: Watch PostCSS parse and transform CSS

- As a developer, I want to see my CSS as PostCSS's syntax tree and toggle plugins so that I understand what a CSS tool chain does
- **Why P1:** PostCSS is the engine under Tailwind, Autoprefixer and most CSS tooling
- **Independent Test:** Edit CSS, pick a node in the tree, toggle each plugin and see the output change

**Acceptance Criteria:**

- [x] AC-003: WHEN the reader edits CSS THEN system SHALL show the real PostCSS syntax tree and highlight the source of a picked node
- [x] AC-004: WHEN the reader toggles a plugin (flatten nesting, add vendor prefixes, minify) THEN the output SHALL change accordingly, plugins SHALL run in the listed order, and sizes SHALL be shown
- [x] AC-005: WHEN the CSS has a syntax error THEN system SHALL show PostCSS's message with line and column

### P2: See what Sass compiles to

- As a developer, I want to edit SCSS and see the CSS it compiles to so that I understand variables, nesting, `&` and mixins as build-time features
- **Why P2:** Common in existing codebases; native CSS nesting changes the trade-off

**Acceptance Criteria:**

- [x] AC-006: WHEN the reader edits SCSS using variables, nesting, `&`, nested media queries or mixins THEN system SHALL show the compiled CSS, matching Dart Sass for the page's samples
- [x] AC-007: WHEN the SCSS uses syntax outside the supported subset or has an error THEN system SHALL say so with the line

### P2: Understand CSS Modules scoping

- As a developer, I want to render two components that both use `.title`, with global CSS and with CSS Modules, so that I see the collision and how scoped names prevent it
- **Why P2:** Explains a common styling approach in React and Next.js

**Acceptance Criteria:**

- [x] AC-008: WHEN global CSS is chosen THEN the rendered frame SHALL show one component's rule overriding the other's
- [x] AC-009: WHEN CSS Modules is chosen THEN each class SHALL be renamed with a content hash, the generated JavaScript mapping SHALL be shown, and the frame SHALL render both correctly; `:global(...)` SHALL stay unscoped

### P3: See Tailwind generate only what is used

- As a developer, I want to edit markup and watch Tailwind's real output so that I understand scanning for class candidates and on-demand generation
- **Why P3:** Explains how a utility framework stays small; relies on the earlier topics

**Acceptance Criteria:**

- [x] AC-010: WHEN the reader edits markup THEN system SHALL list the class candidates found and the real Tailwind output for them, ignoring candidates that aren't utilities
- [x] AC-011: WHEN a class is built dynamically from string pieces THEN system SHALL show it is not found and therefore not generated

## Edge Cases

- WHEN a tool fails to load THEN the demo SHALL say so and the rest of the page SHALL keep working
- WHEN input is empty THEN outputs SHALL be empty without errors
- WHEN only the keyboard is used THEN all controls SHALL be operable

## Success Criteria

- [x] The Sass stand-in's output equals Dart Sass's for every sample on the page (ignoring whitespace)
- [x] axe clean in light and dark, no horizontal overflow at 360 px
- [x] The quality gate (typecheck, lint, build) passes

## Open Questions

- None

## Notes

- Section page 4 of 5; follows "Bundlers", precedes "Inside React".
