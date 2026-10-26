---
paths:
  - "apps/react-handbook/**"
---

# Creating a New Page

When creating a **new page or screen** (a new `page.tsx`, or a major
redesign of one), invoke the `ui-ux-pro-max` skill (Skill tool) **before
writing the page**, to settle layout, visual style, typography, color,
UX patterns and accessibility. Use stack `shadcn/ui` + `Next.js`.

Order of work for a new page:

1. `spec-driven`: the page has a feature spec (user stories, ACs) first.
2. `ui-ux-pro-max`: the design direction (layout, hierarchy, states: empty /
   loading / error, responsive breakpoints, a11y). Record the chosen
   direction in the feature's `design.md`, or in `spec.md` for Medium scope.
3. `vercel-react-best-practices` + shadcn: implement it (see
   `02-ui-implementation.md`).
4. Verify against the spec ACs, including visual and accessibility checks.

Map design tokens to the shadcn CSS variables in `apps/react-handbook/src/app/globals.css`
instead of hard-coding a new palette in the page.
