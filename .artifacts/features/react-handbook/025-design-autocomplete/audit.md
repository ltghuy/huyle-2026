---
id: "025"
feature: design-autocomplete
created: 2026-10-12
---

# Audit: Design an autocomplete

## Goals

- [x] Reachable from sidebar, section page and home (System Design 3 of 3), and listed on the method page — catalog row added; `/system-design/autocomplete` prerendered; method "Next" block links it; verified in the browser (h1, 3 topics, 3 demos).
- [x] Applies the method end to end with the request lifecycle and accessibility as deep dives linking the built debounced-search practice — link verified present.
- [x] Each topic has an interactive reference/diagram responding to the reader, figures labelled examples — architecture SVG (labelled, alternative named), lifecycle demo, combobox demo; all browser-verified.

## Success Criteria

- [x] Stale-guard off leaves displayed results not matching the current query after the burst (showing "r" while typed "react"); guard on keeps them matching ("react") — browser-verified and by scratch logic check.
- [x] Toggling debounce changes the request count (5 → 1 for the same typing); a cache hit issues no request — browser-verified.
- [x] The suggestion list is fully keyboard-operable (arrow/Enter/Escape) with aria-activedescendant tracking the active option, and matches highlighted — browser-verified via dispatched keydowns.
- [x] The deep dive links the debounced-search practice — verified.
- [x] axe clean in light and dark (settled); no 360 px overflow; keyboard-operable. Warning/info log tokens use contrast-safe darkened variants.
- [x] typecheck, lint, build pass.

## Notes

- Also fixed two stray literal `—` in the System Design catalog summaries (method and news-feed) left from earlier features; they now render real em dashes.
- No server lab, consistent with the section: the lifecycle demo is a labelled client simulation over a local corpus; the real implementation is the debounced-search practice.
