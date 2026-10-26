---
name: i18n-locale-content
description: Every user-facing string must live in the locale dictionaries and be added to BOTH en and vi. No hardcoded copy in components.
paths:
  - "apps/web/src/components/**"
  - "apps/web/src/app/**"
  - "apps/web/src/lib/i18n/dictionaries/**"
  - "apps/web/src/content/**"
---

# Rule: Keep locale content in sync (en + vi)

This site is bilingual (**English default + Vietnamese**, client-side toggle — see
`apps/web/src/lib/i18n/config.ts`). **Whenever you create a new component or add/modify a
user-facing element, you MUST add its copy to the locale dictionaries — in BOTH
`en` and `vi` — and read it through the i18n hooks. Never hardcode a
user-facing string in a component.**

## The two localization paths

Pick the right one for what you're adding:

| Kind of text | Where it lives | How to read it |
|---|---|---|
| **UI / prose** — labels, headings, buttons, aria-labels, alt text, placeholders, empty/error states, microcopy | `apps/web/src/lib/i18n/dictionaries/en.ts` (canonical) + `apps/web/src/lib/i18n/dictionaries/vi.ts` | `const { t } = useLocale(); … t.section.key` |
| **Structured content** — profile, experience, projects, skills, gallery items | `apps/web/src/content/*.ts` (English source) + `apps/web/src/content/vi.ts` (Vietnamese overrides) | `const { experience } = useContent()` |

`en.ts` is the **canonical shape**: `Dictionary = typeof en`, and `vi.ts` is
type-checked against it. A key added to `en` but missing in `vi` (or with the
wrong shape) is a **build/type error** — treat that as the guardrail, not a
suggestion.

## What you MUST do

1. **Add UI strings to `en.ts` first**, under the right section, then mirror the
   exact same key in `vi.ts` with the Vietnamese translation.
2. **Read every user-facing string via `t` (`useLocale`) or `useContent()`** —
   no string literals rendered to the DOM, including `aria-label`, `alt`,
   `title`, `placeholder`, and `<meta>`-style copy inside components.
3. **Keep structured lists index-aligned.** `apps/web/src/content/vi.ts` spreads each
   English item and overrides only translated prose; keep array order/length
   identical to the English source so the overlay lines up.
4. **Give real Vietnamese** — do not paste the English string into `vi.ts` as a
   placeholder. If you genuinely cannot translate a token, ask; do not ship
   English in the `vi` tree.
5. **Component adding to a shared client component (`useLocale`/`useContent`)?**
   thread the strings in as props from the localized dictionary rather than
   importing raw content, matching the existing pattern (e.g. `AboutBio`).

## Legitimate exceptions (do NOT localize)

- **Brand / proper nouns** kept identical across locales: `profile.name`,
  `NAME_LEFT`/`NAME_RIGHT` ("HUY"/"LE"), the "SOFTWARE ENGINEER" hero wordmark,
  tech/product nouns (React, Next.js, Naver Care), URLs, icon names.
- **Non-rendered strings**: `data-*` hooks, CSS class names, test ids, keys.
- If a string is intentionally English-only, add a one-line comment saying why
  (see the existing `hero.runnerSince` note in `en.ts`).

## Definition of done

- [ ] New/changed user-facing copy exists in `en.ts` **and** `vi.ts` (same keys).
- [ ] Structured additions exist in `apps/web/src/content/*.ts` **and** `apps/web/src/content/vi.ts`.
- [ ] The component renders it via `t` / `useContent()`, not a literal.
- [ ] `vi` holds real Vietnamese, index-aligned with the English source.
- [ ] Type-check passes (proves the `en`/`vi` shapes match).
