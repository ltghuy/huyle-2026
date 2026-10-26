---
id: "048"
feature: home-hub-links
type: brownfield
scope: medium
status: done
branch: main
created: 2026-10-22
---

# Feature: Home page as a sections hub, and green text links

## Overview

The home page reads top to bottom as an essay: why the site exists, what you
get, how to use it, and only then the sections, which are what most visitors
came for. Returning readers have to scroll past three blocks of text to reach
a section. Text links across the site are styled like body text with an
underline, so they don't stand out in long pages.

This feature puts the sections first on the home page, behind a short hero
with two calls to action, and condenses the rest below. Text links in page
content get the site's green.

## Goals

- [x] A visitor reaches any section from the home page without scrolling past more than the hero, at desktop and phone widths.
- [x] Text links in page content are green in light and dark themes with at least 4.5:1 contrast, and navigation keeps its neutral style.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing the theme's primary color | Decided with the user: only links turn green |
| Section pages, the sidebar or topic page layouts | This feature is the home page and link color only |
| New home copy beyond what the new layout needs | The existing text is kept and shortened where condensed |

## User Stories

### P1: Sections first

- As a visitor, I want the sections at the top of the home page, so that I get to the content quickly.
- **Why P1:** It's the main change.
- **Independent Test:** Open the home page at 1280 px and at 360 px; the first section card is visible without scrolling past the intro text.

**Acceptance Criteria:**

- [x] AC-001: WHEN the home page is shown THEN it SHALL start with a short hero (the eyebrow, the site name, one or two sentences) and two calls to action: start with React Practices, and browse the sections.
- [x] AC-002: WHEN the home page is shown THEN the section cards SHALL come directly after the hero, each with its icon, title, summary and progress, and the "browse the sections" action SHALL move focus to them. Each card SHALL use the green accent on its icon tile and, when it links to a section, on the done count in its progress line, its "Open" label and its hover border; the progress bar keeps the primary color. (Changed 2026-10-25, quick tasks 024-home-cards-green and 026-home-card-count-green: the cards were neutral.)
- [x] AC-003: WHEN the home page is shown THEN "How to use it" SHALL follow the sections as three short steps, then "Why it exists" and "What you get" side by side on wide screens, then "How this site is built" and the references, with the reference groups collapsible.
- [x] AC-004: WHEN the home page is shown THEN it SHALL keep its metadata, its WebSite JSON-LD, one H1, and the signature.

### P1: Green links

- As a reader, I want links in the text to stand out, so that I see where I can go.
- **Why P1:** The user asked for it.
- **Independent Test:** Open a topic page in both themes; inline links, "read more" links and reference links are green; breadcrumbs, the table of contents, the sidebar and cards are not.

**Acceptance Criteria:**

- [x] AC-005: WHEN a text link appears in page content (inline links, "read more" and source links, the home page references, links to pages from inside demos) THEN it SHALL use the link color, green in both themes with at least 4.5:1 contrast on the page and card backgrounds, and keep its underline or hover underline and focus ring.
- [x] AC-006: WHEN navigation is shown (sidebar, breadcrumbs, table of contents, cards, Previous and Next, buttons styled as links, mock pages inside demos) THEN it SHALL keep its current colors, except the home page section cards, which use the green accent described in AC-002.

## Edge Cases

- WHEN the visitor uses a keyboard THEN the "browse the sections" action SHALL move focus to the sections heading, not only scroll.
- WHEN a reference group is collapsed THEN its links SHALL still be reachable by opening it with the keyboard.

## Success Criteria

- [x] At 1280 × 800 and 360 × 800, the first row of section cards starts within the first screen.
- [x] The home page and a topic page pass axe in light and dark themes (apart from the site-wide sidebar finding), with no horizontal scroll at 360 px.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm build` and the end-to-end suite pass.

## Open Questions

- None

## Design Direction

From the ui-ux-pro-max pass (documentation landing pattern: hero, then the
categories, then supporting content):

- Hero: eyebrow, H1, one or two sentences, a primary action (start reading) and a secondary outline action (browse sections). No illustration.
- Sections: the existing cards, three columns on wide screens, two on tablets, one on phones; icon, title, summary, progress.
- Supporting content: compact, lower contrast, two columns on wide screens; references in collapsible groups.
- Links: green from the theme, never color alone (inline links stay underlined, external links keep their icon), focus ring unchanged.
- Theme tokens only; no new palette beyond the link color, which reuses the success green's values.

## Baseline

### Current Behavior

- The home page shows, in order: a header with an intro paragraph, "Why it exists", "What you get", "How to use it", the section cards, then "How this site is built" and references side by side, and the signature.
- Text links use the body text color with an underline.

### Gaps / Limitations

- Sections sit below three text blocks; links don't stand out from body text.
