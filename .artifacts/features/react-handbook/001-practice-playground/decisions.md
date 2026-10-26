---
id: "001"
feature: practice-playground
created: 2026-10-06
---

# Decisions: React Practice Playground

Gray areas resolved with the user during specify. Decisions marked
**(cross-practice)** apply to every follow-up practice feature (002–015).

## Resolved

### Spec split

- **Question:** One spec for everything, grouped specs, or one spec per practice?
- **Decision:** Feature 001 is the shell (sidebar, routing, overview, page frame, placeholders). Each of the 14 practices gets its own feature spec (002–015), built and verified one at a time.
- **Rationale:** Small, independently verifiable increments; each practice has distinct requirements worth specifying on its own.
- **Caveats:** IDs follow catalog order by default; build order is flexible.

### "No third-party library" boundary (cross-practice)

- **Question:** What exactly must be hand-built?
- **Decision:** The core logic of each practice is written from scratch (e.g. toast queue and timers, focus trap, windowing math, grid sorting/filtering, upload progress, caching, debouncing). Basic visual primitives from the project's existing UI kit (button, input, card) may be used for styling. The UI kit's ready-made versions of the practiced pattern (its dialog, toast, accordion, etc.) are **never** used inside the practice that replaces them.
- **Rationale:** The goal is to practice the hard part, not to re-style buttons.
- **Caveats:** Dev-only tooling (type checker, linter, bundler) isn't covered by the rule.

### Demo data source (cross-practice)

- **Question:** Public APIs, client mocks, or this repo's own backend?
- **Decision:** Demos that need data use this repo's own mock backend endpoints with generated data, configurable latency, and error injection. Real-time chat uses a one-way server push stream plus normal requests for sending. File upload sends real bytes to a real endpoint so progress is real.
- **Rationale:** Real network behavior with full control over latency and failures, no external dependency, and it uses the fullstack setup.
- **Caveats:** Mock data is in-memory and resets on server restart; acceptable for a playground.

### Practice page extras (cross-practice)

- **Question:** What does each practice page include besides the demo?
- **Decision:** A short explanation panel (key techniques, trade-offs) and demo controls (such as latency, error rate, dataset size, or naive-vs-optimized toggles) where the practice benefits. No in-app source viewer, and no automated tests for now.
- **Rationale:** Explanation reinforces learning; controls let the user stress the implementation and see the difference.
- **Caveats:** Revisit adding tests if regressions start to hurt.

### Navigation model

- **Question:** URL per practice, or in-page selection?
- **Decision:** Each practice has its own address.
- **Rationale:** Survives refresh, supports back/forward and bookmarks, and allows loading only the opened practice.

### Landing view

- **Question:** What does the right side show before a practice is chosen?
- **Decision:** An overview of all 14 practices with description and build status.

### Small-screen behavior

- **Question:** Desktop-only or responsive?
- **Decision:** On narrow screens the sidebar becomes a slide-in panel behind a menu button.

### Branch

- **Decision:** Work stays on `main`.

### Per-practice route files (implementation finding)

- **Question:** How do practices plug in so that only the opened practice's code is downloaded?
- **Decision:** Each built practice owns a route file; the catalog flags it `built: true`.
- **Rationale:** Measured in T011: a shared dynamic page bundled every practice's client code into every practice page.
- **Caveats:** Adding a practice touches three places (its folder, its route file, its catalog flag); none of them is shell code.

## Tentative

None.
