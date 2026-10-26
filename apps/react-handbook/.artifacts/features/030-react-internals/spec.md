---
id: 030
feature: react-internals
type: greenfield
scope: large
status: done
branch: main
created: 2026-10-13
---

# Feature: Inside React: from JSX to DOM updates

## Overview

React developers write components every day but often can't explain what JSX
produces, why changing an element's type loses state, why list keys matter,
when effects run relative to the screen updating, or why a transition keeps
typing smooth. The last page of Under the Hood picks up where "Transpiling"
(027) left JSX, as function calls, and follows them through React itself.

## Goals

- [x] Five topics explain React's work from elements to the screen, each with a working interactive demo
- [x] Every demo runs the real React that ships with this site and reports what it actually did (objects, fibers, DOM mutations, timings), with React internals clearly labelled as not public API

## Out of Scope

| Feature | Reason |
|---------|--------|
| Server Components and streaming | A separate topic (the Next.js layer), linked |
| Class components and legacy APIs | Not used in modern React |
| Re-implementing React | The demos observe the real library |
| The React Compiler in depth | Mentioned; it changes when components re-render, not how reconciliation works |

## User Stories

### P1: See what JSX produces

- As a React developer, I want to write JSX and see the real objects React's JSX functions return so that I understand an element is a plain description
- **Why P1:** The starting point for everything React does
- **Independent Test:** Edit JSX with a component and a list; read the element objects

**Acceptance Criteria:**

- [x] AC-001: WHEN the reader edits the JSX THEN system SHALL compile it, run it with React's real JSX runtime and show the resulting element objects (type, key, props, children)
- [x] AC-002: WHEN the JSX uses a component THEN the element's type SHALL be shown as the function itself, and system SHALL show the component was not called
- [x] AC-003: WHEN the JSX is invalid or throws THEN system SHALL show the error without breaking the page

### P1: See elements, fibers and the DOM side by side

- As a React developer, I want to inspect the fiber tree behind a live component tree so that I understand where state lives and what "current" and "work in progress" mean
- **Why P1:** The model behind reconciliation, hooks and rendering
- **Independent Test:** Interact with the sample app and see fiber state and the current tree change

**Acceptance Criteria:**

- [x] AC-004: WHEN the sample app renders THEN system SHALL show its fiber tree: kind of fiber, type, key, and for function components their hooks' current values
- [x] AC-005: WHEN the reader updates state in the sample app THEN the fiber tree view SHALL update, and system SHALL show that the root switched to the other copy of the tree
- [x] AC-006: WHEN fibers are shown THEN system SHALL label them as React internals that are not a public API

### P1: Watch reconciliation and keys

- As a React developer, I want to apply changes to a rendered tree and see the exact DOM operations React performs and whether component state survived so that I understand the diffing rules and keys
- **Why P1:** The most common source of state bugs in lists and conditionals
- **Independent Test:** Insert an item at the top of a list with index keys and with stable keys, and compare

**Acceptance Criteria:**

- [x] AC-007: WHEN the reader applies a change THEN system SHALL list the DOM mutations it caused (nodes added, removed, text and attribute changes), recorded from the real DOM
- [x] AC-008: WHEN an element's type changes THEN system SHALL show the subtree was replaced and its state lost; WHEN only props change THEN only attributes or text SHALL change and state SHALL survive
- [x] AC-009: WHEN an item is inserted at the start of a list THEN system SHALL show, for index keys, every item's text changing and typed input staying in the wrong row, and, for stable keys, one inserted node with state following its item

### P2: See the render and commit phases

- As a React developer, I want to see the order React calls my component, applies DOM changes and runs layout and passive effects, relative to the next frame, so that I know where to put each kind of work
- **Why P2:** Explains useLayoutEffect vs useEffect; builds on P1

**Acceptance Criteria:**

- [x] AC-010: WHEN the reader triggers an update THEN system SHALL log, in measured order, renders, DOM commit, layout effects, passive effects and the next frame
- [x] AC-011: WHEN the update comes from a click versus a timer THEN the log SHALL show where passive effects ran relative to the next frame for each

### P3: Compare urgent and transition updates

- As a React developer, I want to type into a slow filtered list with and without deferring the list so that I see interruptible rendering keep input responsive
- **Why P3:** Shows concurrent rendering; the page works without it

**Acceptance Criteria:**

- [x] AC-012: WHEN the reader types or runs the typing simulation THEN system SHALL measure input latency (event to next frame) for each keystroke and show average and worst
- [x] AC-013: WHEN the list is deferred THEN system SHALL report list renders started versus committed, showing abandoned renders

## Edge Cases

- WHEN a demo's sample app throws THEN the rest of the page SHALL keep working
- WHEN the reader resets a demo THEN its sample app SHALL return to its initial state
- WHEN only the keyboard is used THEN all controls SHALL be operable

## Success Criteria

- [x] The facts shown about React's behavior (element shape, effect timing, key behavior) match what the demos measure in the shipped React version
- [x] axe clean in light and dark, no horizontal overflow at 360 px
- [x] The quality gate (typecheck, lint, build) passes

## Open Questions

- None

## Notes

- Section page 5 of 5; completes Under the Hood.
