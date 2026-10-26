---
id: "039"
feature: code-highlighting
created: 2026-10-21
---

# Audit: Syntax colours for quoted code across the handbook

## Goals

- [x] Code on the three Testing pages is coloured by kind: keywords, strings, calls (including capitalised calls such as `Given(...)`), types and JSX components, properties, comments and punctuation; YAML keys and HTML tags too. 557 coloured spans on the strategy page, 2,678 on the Playwright page, 774 on the Cucumber page.

## Success Criteria

- [x] axe `color-contrast`: no violations on any of the three pages in dark or light, with marked lines, open details and the step inspector shown. Two light colours first failed (keyword 4.21:1, call 3.96:1) and were darkened.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm build` pass.

## Notes

- Line numbers, marked lines and scrolling are unchanged; the tokenizer is pure, so server and client render the same spans (no hydration warnings).
- While checking, the run summary showed duplicate React keys for scenarios (all recorded at line 0); rows are now keyed by project, file, group and title.

## Widened scope (same day)

- Every code view now uses the highlighter: the shared code panel (15 demos across Under the Hood), the source view with a marked range (Transpiling, CSS pipeline), the layout-thrashing samples (Rendering), the CSS in the micro-frontends styling demo, and the multi-step form's state inspector (JSON). The language comes from the panel's title (file extension, "CSS", "innerHTML", ".map", and "→ JS" for a transform's output), with an explicit override where the title doesn't say (Tailwind output is CSS; module graphs drawn as trees stay plain).
- Scripted check with Playwright and axe on 11 pages (all five Under the Hood pages, Rendering, Micro frontends, Multi-step form, three Testing pages): coloured spans on each, no contrast violations in dark or light, no console errors.
- The source view's text matches the source exactly with a node selected, and the marked range keeps its colours.
- The highlighter moved to `src/components/playground/code.tsx`, since a practice now uses it too.

## Editable code (same day)

- The 14 code editors (build pipeline hashing, transpiling compiler, JSX and source-map, the bundler file tabs, the Sass, PostCSS, CSS Modules and Tailwind editors, React internals, and Rendering's HTML and CSS boxes) now use `CodeEditor`: a native textarea with transparent text over a coloured copy in the same grid cell.
- Alignment checked by making the textarea's text visible on top: identical box (525 × 387), font (Geist Mono 12px / 19.5px) and padding, no doubled glyphs. The coloured copy's text equals the textarea's value after an edit; horizontal scroll is mirrored (300 → 300); the edit reached the compiled output.
- Playwright + axe over the five Under the Hood pages and Rendering: every editor coloured, no axe violations from the change in either theme, no console errors, no horizontal overflow at 360 px. One pre-existing finding stays: React internals' "Filtered list" (`scheduling-demo.tsx`) is a scrollable list that can't take focus.
