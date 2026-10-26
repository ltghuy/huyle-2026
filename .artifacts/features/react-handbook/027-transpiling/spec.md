---
id: 027
feature: transpiling
type: greenfield
scope: large
status: done
branch: main
created: 2026-10-13
---

# Feature: Transpiling: TypeScript and JSX to JavaScript

## Overview

Browsers run JavaScript only, yet every React project is written in
TypeScript and JSX. Developers rely on a transpiler they never see, so they
can't explain why a type error doesn't stop the dev server, why an `enum`
breaks a fast transpiler, what JSX actually becomes, why modern syntax is
rewritten for older browsers while some features still need polyfills, or how
a stack trace points back at the original line.

This is the second page of the Under the Hood section (after "From source to
bundle", feature 026). It opens up the transform stage: how a compiler reads
source into tokens and a syntax tree, transforms the tree, and prints
JavaScript with a source map.

## Goals

- [x] The page explains the transpiler end to end in five topics, each with a working interactive demo
- [x] The reader can type their own TypeScript/JSX and see every compiler stage (tokens, tree, output, source map) for it, live
- [x] Every "real tool output" shown on the page is the actual output of the named tool and version, not a paraphrase

## Out of Scope

| Feature | Reason |
|---------|--------|
| A complete TypeScript or JSX compiler in the page | The live compiler covers a documented subset; the real tools are linked |
| Type checking in the page | Explained, not implemented: a checker is a different program from a transpiler |
| Writing compiler plugins | Advanced; the next pages and official docs cover plugin systems |
| Bundling and CSS | Pages 028 and 029 |

## User Stories

### P1: See a compiler's stages on my own code

- As a developer, I want to type TypeScript/JSX and see its tokens, syntax tree and JavaScript output so that I understand what a transpiler does
- **Why P1:** The core of the page; every other topic builds on it
- **Independent Test:** Edit the sample, add a typed parameter and a JSX element, and see all three views update

**Acceptance Criteria:**

- [x] AC-001: WHEN the reader edits the source THEN system SHALL show the token list (kind, text, line:column), the syntax tree, and the JavaScript output, updated as they type
- [x] AC-002: WHEN the source contains type annotations, type aliases, interfaces, `as`, `satisfies` or non-null assertions THEN the tree SHALL show them as type nodes and the output SHALL contain none of them
- [x] AC-003: WHEN the source has a syntax error or uses syntax outside the supported subset THEN system SHALL show the message with line and column, keep the last good output visible but marked as stale, and never crash
- [x] AC-004: WHEN the reader picks a node in the tree THEN system SHALL highlight the source text that node came from
- [x] AC-005: WHEN the page shows the live compiler THEN it SHALL state that it is a simplified compiler and list the supported subset

### P1: Understand stripping types vs checking them

- As a developer, I want to see which TypeScript constructs simply disappear and which need code generated so that I understand fast transpilers' limits and why the build doesn't catch type errors
- **Why P1:** The most common misconception about TypeScript tooling
- **Independent Test:** Pick each construct and read whether it is erasable, its real output, and which tools accept it

**Acceptance Criteria:**

- [x] AC-006: WHEN the reader picks a construct (type annotation, interface, type-only import, enum, const enum, namespace, parameter property, satisfies) THEN system SHALL show its real TypeScript output and whether it is erasable
- [x] AC-007: WHEN a construct is not erasable THEN system SHALL say which per-file tools or settings reject it and why
- [x] AC-008: WHEN the reader views the type-error example THEN system SHALL show that the transpiled output is produced and runs while the type checker reports the error

### P2: Compare the JSX runtimes

- As a React developer, I want to switch between the classic and automatic JSX transforms so that I know what my JSX becomes and why `import React` is no longer needed
- **Why P2:** Explains a visible change in React projects; builds on the live compiler

**Acceptance Criteria:**

- [x] AC-009: WHEN the reader switches the JSX runtime THEN the live compiler output SHALL change between createElement calls and jsx/jsxs calls with the runtime import
- [x] AC-010: WHEN an element has a key or several children THEN the automatic output SHALL pass the key separately and use the static-children form, matching the real transform

### P2: See syntax lowering and polyfills

- As a developer, I want to pick a browser target and see modern syntax rewritten so that I understand what targets and polyfills do and cost
- **Why P2:** Explains build targets and bundle growth; not needed for P1

**Acceptance Criteria:**

- [x] AC-011: WHEN the reader picks a target THEN system SHALL show each sample feature's real output for that target and its size
- [x] AC-012: WHEN a feature is a new built-in function rather than syntax THEN system SHALL show that the transpiler leaves it unchanged and a polyfill is needed

### P3: Follow a source map back to the source

- As a developer, I want to pick a position in the output and see where it came from so that I understand how the developer tools map compiled code back to my files
- **Why P3:** Deepens understanding; the page works without it

**Acceptance Criteria:**

- [x] AC-013: WHEN the live compiler produces output THEN system SHALL show the real source map (version 3) with its encoded mappings
- [x] AC-014: WHEN the reader picks an output segment, by pointer or keyboard, THEN system SHALL highlight the original source position and show the decoded segment

## Edge Cases

- WHEN the source is empty THEN system SHALL show empty views without error
- WHEN the source is very long THEN views SHALL scroll inside their panels and the page SHALL stay responsive
- WHEN the reader resets the editor THEN system SHALL restore the original sample
- WHEN the reader uses only the keyboard THEN all controls, the tree and the mapping list SHALL be operable

## Success Criteria

- [x] For the page's sample inputs, the live compiler's output matches the real transform's output (ignoring whitespace)
- [x] axe clean in light and dark, no horizontal overflow at 360 px
- [x] The quality gate (typecheck, lint, build) passes

## Open Questions

- None

## Notes

- Section page 2 of 5; follows "From source to bundle" and precedes "Bundlers".
- Real outputs are generated with the named tool versions at authoring time and labelled with the tool and version.
