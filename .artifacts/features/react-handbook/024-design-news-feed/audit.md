---
id: "024"
feature: design-news-feed
created: 2026-10-12
---

# Audit: Design a news feed

## Goals

- [x] Reachable from sidebar, section page and home (System Design 2 of 2), and linked from the method page's "Next" block — catalog row added; `/system-design/news-feed` prerendered; method page links here; verified in the browser (h1, 3 topics, 3 demos).
- [x] Applies the method end to end with the hard parts as deep dives linking the built practices — topic 3 links infinite-scroll, virtualized-list, lazy-images, data-fetching-hook, realtime-chat (and data-grid); confirmed the links render.
- [x] Each topic has an interactive reference/diagram responding to the reader, figures labelled examples — architecture SVG (labelled, alternative named), pagination demo, optimistic demo; all browser-verified.

## Success Criteria

- [x] Offset pagination duplicates an item after a head insert; cursor does not — browser-verified (offset "seen again" x2; cursor none) and by scratch logic check.
- [x] Optimistic like updates instantly and rolls back to the exact prior count on rejection — browser-verified (128→129 confirmed; 129→128→rollback to 129).
- [x] Each deep dive links its built practice — verified.
- [x] axe clean in light and dark; no 360 px overflow; keyboard-operable (native radios/buttons, focus rings). Duplicate chips and the optimistic button use contrast-safe tokens (darkened destructive in light).
- [x] typecheck, lint, build pass.

## Notes

- Also fixed a stray literal `—` in the method page's catalog summary (escaping leftover from feature 023) while adding the news-feed row.
- No server lab, consistent with the section: pagination and optimistic demos are labelled client-side simulations; the deep-dive implementations are the existing React practices.
