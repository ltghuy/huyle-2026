---
id: 026
feature: under-the-hood-pipeline
type: greenfield
scope: large
status: done
branch: main
created: 2026-10-13
---

# Feature: Under the Hood section + "From source to bundle"

## Overview

Developers often start a project with one scaffolding command (Create React
App, Vite, Next.js) and never look at what it runs. When a build breaks, a
bundle is too large, a cache serves stale code, or a team must migrate off a
deprecated tool (Create React App was sunset in February 2025), they have no
model of what happens between their source files and what the browser loads.

This feature opens a new handbook section, **Under the Hood**, for the work
done between source code and the screen, and writes its first page, **From
source to bundle**: the end-to-end map of a frontend build. Later pages
(features 027-030) go deep on transpiling, bundlers, the CSS pipeline and
React's tree internals; this page names each stage and links to them.

Audience: a mid-level developer who uses these tools daily, read by a senior
developer who wants a precise, correct reference to teach from.

## Goals

- [x] A sixth handbook section, Under the Hood, is reachable from the home page and sidebar, listing its five planned pages (one written, four marked not ready)
- [x] The first page explains the build pipeline end to end in five topics, each with a working interactive demo
- [x] At least one demo shows real measurements of this site's own build output, not a simulation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Deep dives into transpiling, bundler internals, CSS processing, React reconciliation | Each is its own later page (features 027-030) |
| Running real build tools (webpack, Vite, SWC) in the demos | The site runs on an edge runtime without native binaries; demos are simplified, labelled models |
| Step-by-step migration guide off Create React App | Reference page, not a tutorial; links to official guides instead |
| Package managers, lockfiles, monorepos | Separate topic; not part of turning source into a bundle |

## User Stories

### P1: Open the Under the Hood section

- As a reader, I want a new section on the home page and in the sidebar so that I can find the build and internals topics
- **Why P1:** Without the section there is nowhere for this and the next four pages to live
- **Independent Test:** Open the home page, see the section card with "1 of 5 pages written", open it, see five pages (one linked as ready)

**Acceptance Criteria:**

- [x] AC-001: WHEN the home page loads THEN system SHALL show an Under the Hood card with its own icon, a one-sentence summary and progress "1 of 5 pages written"
- [x] AC-002: WHEN the reader opens the section THEN system SHALL show a section index listing the five pages with titles and summaries, the unwritten ones marked as not ready
- [x] AC-003: WHEN the sidebar renders THEN system SHALL show the section as a folder with its five pages, only the written one navigable as ready, and the header total SHALL include the new topics

### P1: Understand which tool does which job

- As a developer who only ran a scaffolding command, I want to see which tool does each job in Create React App, Vite and Next.js so that I know what actually runs
- **Why P1:** The core mental model of the page: the build is a chain of separate tools, and setups differ only in which tool fills each slot
- **Independent Test:** Pick each of the three setups and read, for every job, the tool it uses in development and in production

**Acceptance Criteria:**

- [x] AC-004: WHEN the reader picks a setup THEN system SHALL show, for each job (resolve imports, transform TypeScript/JSX, type-check, process CSS, bundle, minify, serve in development, hot update), the tool that does it in development and in production
- [x] AC-005: WHEN a setup type-checks in neither or only one mode THEN system SHALL say so explicitly rather than leave the slot empty
- [x] AC-006: WHEN Create React App is shown THEN system SHALL mark it as deprecated with the date it was sunset

### P1: Step through the pipeline stages

- As a reader, I want to run a small sample project through resolve, transform, bundle, optimize and emit one stage at a time so that I see what each stage takes in and produces
- **Why P1:** This is the "under the hood" view the page promises
- **Independent Test:** Step from the first to the last stage and see the artifact change at each one

**Acceptance Criteria:**

- [x] AC-007: WHEN the reader advances a stage THEN system SHALL show that stage's input, what it does in one sentence, and its output for the sample project
- [x] AC-008: WHEN the resolve stage is shown THEN system SHALL list every import of the sample and the file or package each resolves to, including one bare package import
- [x] AC-009: WHEN the bundle and optimize stages are shown THEN system SHALL show output sizes, and the optimize stage SHALL show the unused export removed and code minified
- [x] AC-010: WHEN the reader goes back or restarts THEN system SHALL restore the earlier stage exactly

### P2: See how development and production builds differ

- As a reader, I want to switch the same sample between development and production so that I understand why dev output is large and slow and production output is small
- **Why P2:** Explains everyday confusion (dev warnings, bundle size, source maps) but builds on the P1 model

**Acceptance Criteria:**

- [x] AC-011: WHEN the reader switches mode THEN system SHALL show the output's size, whether it is minified, whether file names carry a content hash, whether a source map is emitted, and whether development-only checks remain
- [x] AC-012: WHEN production mode is shown THEN system SHALL show a development-only branch removed because the build replaced the mode flag with a constant

### P2: See why content hashes make caching safe

- As a reader, I want to edit one source file and see which output file names change so that I understand long-term caching and cache busting
- **Why P2:** Common production problem (stale code after deploy) with a precise, demonstrable cause

**Acceptance Criteria:**

- [x] AC-013: WHEN the reader edits a sample file THEN system SHALL recompute real content hashes in the browser and highlight which output names changed and which stayed the same
- [x] AC-014: WHEN the shared runtime is not split out THEN system SHALL show that editing one page changes more file names than when it is split out

### P3: See what this page actually loaded

- As a reader, I want a list of the script and style files this very page loaded, with sizes, so that I connect the model to a real build
- **Why P3:** Real evidence that grounds the simplified demos; not needed to understand them

**Acceptance Criteria:**

- [x] AC-015: WHEN the reader runs the measurement THEN system SHALL list the build output files this page loaded (from the browser's own timing data) with transferred and decoded size and whether they came from cache, and a total
- [x] AC-016: WHEN the browser hides sizes for a file THEN system SHALL say the size is unavailable instead of showing zero

## Edge Cases

- WHEN the reader edits a sample file to be empty THEN system SHALL still compute hashes and show the output
- WHEN the browser lacks the timing data the measurement needs THEN system SHALL explain the measurement is unavailable
- WHEN the page is reloaded and files come from cache THEN system SHALL show them as cached rather than zero-sized downloads
- WHEN the reader uses only the keyboard THEN every demo control SHALL be reachable and operable, with its state announced in text

## Success Criteria

- [x] All five topics render with a working demo and pass the existing automated accessibility check with no violations
- [x] Every tool fact on the page (which tool does which job, versions, dates) matches the official documentation linked from the page
- [x] The quality gate (typecheck, lint, build) passes

## Open Questions

- None

## Notes

- Planned section pages, in order: From source to bundle (this feature); Transpiling: from TypeScript and JSX to JavaScript (027); Bundlers: module graph, runtime, chunks and dev servers (028); The CSS pipeline (029); Inside React: from JSX to DOM updates (030).
- Simplified demos are labelled "simplified", following the accessibility page's precedent.
