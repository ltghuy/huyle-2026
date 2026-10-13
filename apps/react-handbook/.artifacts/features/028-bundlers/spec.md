---
id: 028
feature: bundlers
type: greenfield
scope: large
status: done
branch: main
created: 2026-10-13
---

# Feature: Bundlers: graph, runtime, chunks and dev servers

## Overview

Developers configure bundlers by copying snippets: they can't say why an
import of a package picks one file over another, what the code wrapped around
their modules does, why a library isn't tree-shaken, why a lazy route
downloads a shared module twice, or why one edit hot-updates while another
reloads the page. Page 3 of Under the Hood opens the bundle stage of "From
source to bundle" (026), building on the compiler from "Transpiling" (027).

## Goals

- [x] The page explains bundling end to end in five topics, each with a working interactive demo
- [x] The demos are driven by one small, working bundler: the reader's edits to the sample files change the graph, the bundle, and what runs
- [x] Bundled code really executes in the page, so evaluation order, the module cache and circular-import failures are observed, not described

## Out of Scope

| Feature | Reason |
|---------|--------|
| Bundling real npm packages | The sample project's packages are small stand-ins |
| Running real webpack, Rollup, Rolldown or Turbopack | Not possible on the edge runtime; simplified bundler, labelled |
| CSS and asset bundling | Page 029 |
| Timing benchmarks of real dev servers | Varies by machine and version; the page compares the work each design does |

## User Stories

### P1: See how imports resolve into a module graph

- As a developer, I want to resolve an import step by step and see the module graph of a project so that I understand what a bundler reads and why a package entry is chosen
- **Why P1:** Everything else in the page works on the graph
- **Independent Test:** Resolve a bare import under different conditions and see a different file chosen; edit a file's import and see the graph change

**Acceptance Criteria:**

- [x] AC-001: WHEN the reader resolves a specifier THEN system SHALL list each step tried (file, extension, index file, package.json field or export condition) and the result
- [x] AC-002: WHEN the reader changes the active conditions (browser vs node, import vs require) THEN the same bare import SHALL resolve to the file the package's exports map selects for those conditions
- [x] AC-003: WHEN the specifier names a subpath the package doesn't export, or a file that doesn't exist THEN system SHALL show the resolution error
- [x] AC-004: WHEN the project is shown THEN system SHALL show its module graph: each module, what it imports (static, dynamic, side-effect only) and what imports it; cycles SHALL be flagged
- [x] AC-005: WHEN the reader edits a sample file THEN the graph SHALL update; an unresolvable import or a syntax error SHALL be reported with the file and position

### P1: Watch the bundle run

- As a developer, I want to see the code a bundler wraps around my modules and run it so that I understand the runtime, evaluation order and the module cache
- **Why P1:** The runtime is the part developers never see and the source of circular-import bugs
- **Independent Test:** Run the bundle and read the log: each module evaluates once, in dependency order

**Acceptance Criteria:**

- [x] AC-006: WHEN the bundle is shown THEN it SHALL be real, runnable output: each module wrapped in a function, imports rewritten to runtime calls, exports exposed as live bindings
- [x] AC-007: WHEN the reader runs the bundle THEN system SHALL execute it and log, in order, each module evaluation, cache hits, and the program's own output
- [x] AC-008: WHEN the reader runs the circular-import sample THEN system SHALL show the real error raised when a module reads a binding that isn't initialized yet, and which import cycle caused it

### P2: Understand tree shaking and side effects

- As a developer, I want to see which modules and exports end up in the bundle, and how the side-effects flag and pure annotations change that, so that I can make libraries tree-shakeable
- **Why P2:** A common cause of oversized bundles; builds on the graph

**Acceptance Criteria:**

- [x] AC-009: WHEN tree shaking runs THEN system SHALL mark each export as used or removed, each module as included or dropped with the reason, and show the bundle size before and after
- [x] AC-010: WHEN the reader marks the package as free of side effects THEN unused re-exported modules SHALL be dropped; otherwise they SHALL be kept with the reason
- [x] AC-011: WHEN the reader toggles the pure annotation on an unused top-level call THEN the call SHALL be removed or kept accordingly

### P2: See code splitting and lazy loading

- As a developer, I want dynamic imports to become separate chunks, and to see shared modules split or duplicated, so that I understand what a lazy route downloads
- **Why P2:** Explains chunk files and waterfalls in real apps

**Acceptance Criteria:**

- [x] AC-012: WHEN the project has dynamic imports THEN system SHALL show the chunks with their modules and sizes
- [x] AC-013: WHEN the reader toggles splitting of shared modules THEN a module used by two lazy chunks SHALL move into its own chunk or be duplicated in both
- [x] AC-014: WHEN the reader opens lazy routes in the running bundle THEN system SHALL log each chunk download (simulated network delay) and show that a chunk already loaded is not downloaded again

### P3: Compare dev servers and hot updates

- As a developer, I want to compare what bundle-first, native-ESM and incremental dev servers do on start and on edit, and see how a hot update propagates, so that I understand why some edits reload the page
- **Why P3:** Explains tool choice and HMR behavior; the page works without it

**Acceptance Criteria:**

- [x] AC-015: WHEN the reader picks a project size THEN system SHALL compare, for each dev-server design, the modules transformed before the first page, the requests the browser makes, and the work done on one edit, labelled as a model
- [x] AC-016: WHEN the reader edits a module in the HMR demo THEN system SHALL show the propagation path to the nearest module that accepts the update, or a full reload when none does

## Edge Cases

- WHEN a sample file is emptied THEN the graph and bundle SHALL still build
- WHEN bundled code throws or loops THEN the page SHALL report the error and stay responsive (bounded execution)
- WHEN the reader resets THEN all sample files SHALL be restored
- WHEN only the keyboard is used THEN all controls SHALL be operable

## Success Criteria

- [x] The sample bundle's run log matches the order a native ES module runtime would evaluate the same files
- [x] axe clean in light and dark, no horizontal overflow at 360 px
- [x] The quality gate (typecheck, lint, build) passes

## Open Questions

- None

## Notes

- Section page 3 of 5; follows "Transpiling", precedes "The CSS pipeline".
