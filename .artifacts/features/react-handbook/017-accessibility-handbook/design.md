---
id: "017"
feature: accessibility-handbook
created: 2026-10-08
---

# Technical Design: Accessibility Handbook

## Scope

In: mark the Accessibility page written in the catalog, replace its placeholder
with the handbook (intro, table of contents, ten topics, ten client demos), and
share the `Topic` layout and table of contents between both handbook pages.
Out: new dependencies, API routes (every demo runs in the browser), changes to
the Performance page's content.

## Research Summary

- web.dev *Learn Accessibility* content-design modules (slugs `aria-html`, `structure`, `more-html`, `focus`, `javascript`, `images`, `color-contrast`, `motion`, `typography`, `video-audio`, `forms`, `patterns`, `design-ux`), grouped into ten topics (decisions).
- Contrast: WCAG 2 relative luminance (sRGB channel `c ≤ 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4`, `L = 0.2126R + 0.7152G + 0.0722B`), ratio `(L1+0.05)/(L2+0.05)`.
- Text spacing (WCAG 1.4.12): line height 1.5, paragraph spacing 2× font size, letter 0.12em, word 0.16em.
- Media (WCAG AA): recorded audio only → transcript; recorded video only → transcript or audio track; recorded video with sound → captions + audio description (transcript recommended); live video with sound → captions; live audio only → none at AA (live captions/transcript recommended).
- Browsers use `placeholder` as a last-resort accessible name, which is why a placeholder-only field still has a name that vanishes as you type.
- ui-ux-pro-max (ux domain): reduced motion respected, errors next to their field, focus rings visible, text contrast 4.5:1; same layout and tokens as the Performance page (feature 016 design).

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Handbook page | `TopicFrame` + content in `src/handbook/{page}/` + one `DemoStage` per demo, unique label | a new page header | `src/handbook/performance/content.tsx` |
| Topic layout | `Topic` (number, h2 anchor, intro, points, demo, DoAvoid, links) | per-page copies | `src/handbook/performance/topic.tsx` |
| Browser flags | `useSyncExternalStore` with a server snapshot | reading `window` in render | `src/handbook/performance/use-supports.ts` |
| Handlers | named `handleX`, one-line inline only | multi-line inline handlers | `.claude/rules/react-handbook/05-event-handlers.md` |
| Colors | theme tokens; the contrast demo's user-picked colors are inline styles (they are the data) | raw palette classes | `src/app/globals.css` |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| Topic | `src/handbook/performance/topic.tsx` | move to `src/handbook/topic.tsx`, import from both pages |
| Table of contents | inline in `src/handbook/performance/content.tsx` | extract to `src/handbook/toc.tsx` |
| TopicFrame | `src/components/playground/topic-frame.tsx` | import |
| Button, Checkbox, Input, Label, RadioGroup | `src/components/ui/*` | controls |
| Practice links | `practiceHref` in `src/practices/catalog.ts` | links to practices 8 and 11 |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| Node reading | What the simplified reader gets from one element |
| Contrast result | Ratio and pass/fail per level |
| Media needs | Required/recommended alternatives for one media kind |

#### Node reading (`a11y-reader.ts`)

- `role` (explicit `role` or implicit from the tag), `name` (+ `nameFrom`: labelledby / label / alt / legend / content / title / placeholder), `description` (from `aria-describedby`), `states` (required, invalid, expanded, pressed, checked, disabled), `focusable`
- `announce(el)` → one line like a screen reader: "Email, edit text, required, invalid entry, Enter an address like name@example.com"
- `outline(root)` → landmarks (role + name) and headings (level + text) in document order, plus problems (no landmarks, skipped level, no h1)

### API Contracts

None.

## Decisions

| Decision | Rationale |
|----------|-----------|
| One shared simplified reader (`a11y-reader.ts`) for semantics, structure, dynamic content, forms and annotations | Every "what it gets" line is read from the real DOM, one implementation to trust and label "simplified" |
| Announcement log driven by a `MutationObserver` on the demo's live region and by focus/expanded changes, not by React state | It shows what the page really exposed: with the live region off, the count still changes on screen but nothing is logged |
| Same-looking sample pages for structure (generic boxes vs meaningful elements vs a skipped level), rendered in a `srcdoc` iframe | Shows that structure is invisible to the eye and obvious to assistive technology; in its own document the sample's header/main/footer are real top-level landmarks and its title and lang are its own (nested inside the page they would be generic or fail axe) |
| Focus order logged from `focusin` inside the demo | Real focus order, including positive `tabindex` jumps |
| Contrast from `<input type="color">` hex values, computed with the WCAG formula; grayscale with a CSS `filter` | No library, exact thresholds |
| Typography overflow measured as `scrollHeight - clientHeight` of the fixed card from a `ResizeObserver` on its text; both cards are at most 320 px wide so the result is the same on any screen | The "cut off" message is measured, not assumed |
| Motion banner moved with the Web Animations API (pause/play, current time), reduced motion read with `matchMedia` through `useSyncExternalStore` | Pause control and the 5 s timer use the animation's own clock; no global CSS keyframes needed |
| Form errors: summary focused on submit (`tabIndex=-1`), fields with `aria-invalid` + `aria-describedby` (hint + error) | WCAG error identification; mirrors practice 11 |
| Topic and table of contents moved to `src/handbook/` | Both handbook pages share them; Performance page output unchanged |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| catalog | `src/practices/catalog.ts` | modify | accessibility `written: true`, new summary |
| Topic | `src/handbook/topic.tsx` | move | shared topic layout (unchanged) |
| Toc | `src/handbook/toc.tsx` | new | "On this page" list |
| Performance content | `src/handbook/performance/content.tsx` | modify | import shared Topic/Toc |
| Accessibility page | `src/app/(playground)/performance-accessibility/accessibility/page.tsx` | modify | renders the handbook |
| Handbook content | `src/handbook/accessibility/content.tsx` | new | intro, TOC, ten topics |
| reader | `src/handbook/accessibility/a11y-reader.ts` | new | role, name, description, states, focusable, announce, outline |
| SemanticsDemo | `.../semantics-demo.tsx` | new (client) | div / div+ARIA / button, readings, activation counts |
| StructureDemo | `.../structure-demo.tsx` | new (client) | sample page in two builds, outline + problems |
| FocusDemo | `.../focus-demo.tsx` | new (client) | skip link, positive tabindex, hide outline toggles; visit log |
| DynamicDemo | `.../dynamic-demo.tsx` | new (client) | add to cart (live region on/off), disclosure, announcement log |
| AltTextDemo | `.../alt-text-demo.tsx` | new (client) | use choice, alt input, reading, feedback |
| MediaNeeds | `.../media-needs.tsx` | new (client) | kind + live/recorded → alternatives list |
| contrast | `.../contrast.ts` | new | `contrastRatio(hexA, hexB)`, `LEVELS` |
| ContrastDemo | `.../contrast-demo.tsx` | new (client) | color pickers, presets, verdicts, grayscale error sample |
| TypographyDemo | `.../typography-demo.tsx` | new (client) | 200% / spacing / justify toggles, two cards, measured clipping |
| MotionDemo | `.../motion-demo.tsx` | new (client) | system setting, simulate toggle, banner with pause and timer |
| FormsDemo | `.../forms-demo.tsx` | new (client) | two versions, focused-field announcement, error summary |
| AnnotationsDemo | `.../annotations-demo.tsx` | new (client) | sample card with badges, reading table |

## Data Flow

1. Server page renders the header, notes and `DemoStage`s; each demo is a small client leaf.
2. Reader-based demos keep a ref to their sample root and re-read it after each commit that changes the markup (layout effect) or on the event (focus, click).
3. DynamicDemo: click → state count → React renders the live region text → `MutationObserver` sees the change → log line.
4. ContrastDemo: hex state → `contrastRatio` (pure) → verdicts.
5. TypographyDemo: toggles → classes/styles → layout effect + ResizeObserver → clipped flags.
6. MotionDemo: `matchMedia` store + toggle → the moving banner (its own component, remounted when reduced motion changes) calls `element.animate()`; a 250 ms timer reads `animation.currentTime`.
7. StructureDemo: the sample is a `srcdoc` iframe with the page's theme tokens copied in; its `load` event runs the outline on the iframe document.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | catalog | catalog.ts | Done |
| AC-002 | page, content, Toc | accessibility/page.tsx, content.tsx, toc.tsx | Done |
| AC-003 | SemanticsDemo, reader | semantics-demo.tsx, a11y-reader.ts | Done |
| AC-004 | StructureDemo, reader | structure-demo.tsx | Done |
| AC-005 | FocusDemo | focus-demo.tsx | Done |
| AC-006 | DynamicDemo, reader | dynamic-demo.tsx | Done |
| AC-007, AC-008 | AltTextDemo, MediaNeeds | alt-text-demo.tsx, media-needs.tsx | Done |
| AC-009, AC-010 | ContrastDemo, contrast | contrast-demo.tsx, contrast.ts | Done |
| AC-011 | TypographyDemo | typography-demo.tsx | Done |
| AC-012 | MotionDemo | motion-demo.tsx | Done |
| AC-013, AC-014 | FormsDemo, reader | forms-demo.tsx | Done |
| AC-015 | AnnotationsDemo, reader | annotations-demo.tsx | Done |
| AC-016, AC-017 | content, Topic | content.tsx, topic.tsx | Done |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | none (no test runner in the repo) |
| Command | `pnpm typecheck && pnpm lint && pnpm build` + browser checks |
| Location | scratch scripts outside the repo |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| contrast | scratch Node script | black/white 21, #767676 on white ≈ 4.54 (passes), #777 on white ≈ 4.48 (fails) |
| demos | Puppeteer on `pnpm start` | div not focusable, button is; outline per build; tabindex order; log with/without live region; alt feedback; clipped card; banner paused under reduced motion (`emulateMediaFeatures`); error summary focus; axe both themes; 360 px |

## Considerations

### Error Handling

- Each demo sits in `DemoStage` (error boundary with retry). Missing `matchMedia`/`ResizeObserver` fall back to "not available" text.

### Security

- None (no input leaves the browser).

## Open Questions

- None.
