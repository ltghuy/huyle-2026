---
id: 019
feature: home-landing
type: brownfield
scope: medium
status: done
branch: main
created: 2026-11-03
---

# Feature: Home page with a landing hero

## Overview

The home page is a plain dashboard: a "Bài học hôm nay" title, the streak and points, and today's lesson card. A first-time visitor sees no explanation of what Streak Daily is or what else it offers, and nothing points to the vocabulary, grammar or exercise pages except the sidebar. The owner asked for a home page in the spirit of a landing page (reference: engdailystreak.com: a big wordmark hero, benefits next to a small demo, activity cards and a closing call to action). The lesson stays on the home page, right under the hero, so returning learners lose nothing.

## Goals

- [x] A first-time visitor understands what Streak Daily is and how to start, from the first screen
- [x] A returning learner still reaches today's lesson from the home page in one tap
- [x] Every main practice area is linked from the home page

## Out of Scope

| Feature | Reason |
|---------|--------|
| Copying the reference's copy, colours, mascot or branding | Only its structure is borrowed; Streak Daily keeps its own theme and words |
| A top navigation bar, search or sign-in | The app keeps its sidebar, is account-free and has search in Từ vựng |
| A footer with contacts or donations | Not asked for; credits already sit in the sidebar |
| Scroll-triggered animation libraries | Subtle CSS only, no new dependency |

## User Stories

### P1: Understand the app and start today's lesson

- As a first-time visitor, I want to see what Streak Daily is and a clear way in so that I start learning instead of guessing
- **Why P1:** the home page is the first page everyone sees
- **Independent Test:** open `/` with a fresh profile: the hero names the app, says what it does, and its main button opens today's lesson

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner opens `/` THEN system SHALL show a hero with the "Streak Daily" wordmark as the page's only `h1`, a short Vietnamese tagline, a "Vào bài hôm nay" button to `/lesson`, a "Xem cách học" button to the benefits section, and a "Miễn phí · Không cần tài khoản" note
- [x] AC-002: WHEN the hero is shown THEN system SHALL show today's lesson section ("Bài học hôm nay", the streak and points, and the lesson card, unchanged in behavior) right below it, keeping the tour targets

### P2: Learn how it works and find the practice areas

- As a learner, I want to see why the method works and what else I can practise so that I use more of the app
- **Why P2:** it helps people discover the app, but the lesson already works without it

**Acceptance Criteria:**

- [x] AC-003: WHEN a learner scrolls past the lesson THEN system SHALL show a "Cách học" section with four benefits (chuỗi ngày học, ôn đúng lúc sắp quên, phát âm có IPA và audio, viết câu theo chủ đề) next to a static example of a word-order exercise
- [x] AC-004: WHEN the practice section is shown THEN system SHALL link six areas, each with an icon, a title and one line of description: Từ vựng (`/vocabulary`), Ngữ pháp (`/grammar`), Viết câu (`/exercises?tab=sentence`), Nghe chép (`/exercises?type=dictation`), Động từ bất quy tắc (`/irregular-verbs`) and Ôn tập (`/review`)
- [x] AC-005: WHEN a learner reaches the end of the page THEN system SHALL show a closing band with a heading, one line of text and a button to `/lesson`

### P3: Profile looks like the home page

- As a learner, I want the profile page to look like the home page so that the app feels like one product
- **Why P3:** consistency, asked for after the home page shipped (2026-11-03)

**Acceptance Criteria:**

- [x] AC-006: WHEN a learner opens `/profile` THEN system SHALL show the same hero as the home page at a smaller size (pill "Mỗi ngày bạn lại tiến thêm một chút", `h1` "Hồ sơ của bạn" in plain text (only the home wordmark is a gradient, 2026-11-03), one line of text), the "Chuyên cần" and "Tiến bộ" sections with the home page's section headings (eyebrow, `h2`, one line), the stat cards with the same icon chips as the home page's streak and points, and the closing band; their content and behavior are unchanged

## Edge Cases

- WHEN the learner hasn't done the placement test THEN system SHALL still redirect to `/placement` as before (the hero is static and doesn't change this)
- WHEN today's lesson is done THEN system SHALL keep the hero and its "Vào bài hôm nay" button (the lesson page shows the finished state)
- WHEN the theme is dark or a different accent colour is chosen THEN system SHALL keep readable contrast, since every colour comes from the theme tokens
- WHEN the screen is 360 px wide THEN system SHALL stack every section with no horizontal scroll

## Success Criteria

- [x] On a 1440×760 desktop, the lesson card's title is visible without scrolling
- [x] The page stays a static, prerendered shell; lint, typecheck, tests and build pass

## Open Questions

- None

## Notes

Requested on 2026-11-03 with engdailystreak.com as the reference. The owner chose: hero + lesson + sections (lesson kept right under the hero), and the current theme with a gradient accent rather than the reference's colours.

### Design direction (ui-ux-pro-max)

- Pattern: hero (value + CTA above the fold) → product (the lesson) → features → closing CTA. From `lg` the hero is split: text left-aligned, the 3D owl on the right (feature 021); stacked and centred below `lg`
- Style: flat, the app's own shadcn tokens in light and dark; the only flourish is the wordmark gradient from `primary` to `streak` (interpolated with increasing hue, so it passes through purple and pink rather than grey or green, and the box is only as wide as the word) and a soft blurred `primary` glow behind the hero
- Type: the app's current font; wordmark 48 px on phones, 72 px from `md`; body 16 px
- Icons: Lucide, matching the sidebar's (no emoji)
- Cards: `rounded-xl border bg-card`, link cards with a 150–200 ms hover colour shift and a visible focus ring; touch targets ≥ 44 px
- Buttons: the `lg` variant at 44 px (`h-11`) with the variant's 14 px text, sized to their label: the hero pair side by side even on phones, the lesson card's start button full width only below `sm` (2026-11-03: the first version's 48 px, 16 px, full-width buttons looked too big)
- Motion: none beyond hover transitions, under `motion-safe`
- Shared pieces: the hero and the section heading are components used by both pages, so they can't drift apart; stat icons sit in `size-10` (`size-8` on phones) `bg-streak/15` chips
- Responsive: one column on phones; benefits + demo side by side from `lg`; activities 1 / 2 / 3 columns

## Baseline

### Current Behavior

- `/` shows the "Bài học hôm nay" title and description, the streak and points, the lesson card (parts, progress, start button), and after finishing, the extra lesson and followed set cards

### Gaps / Limitations

- Nothing explains the app to a new visitor, and the practice areas are only reachable through the sidebar

## Verification

- 2026-11-03: `pnpm lint`, `pnpm typecheck`, `pnpm test` (895 passed) and `pnpm build` pass; `/` stays static (`○ /`). `src/app/(app)/page.test.tsx` covers AC-001 to AC-005 (one `h1`, both lesson links, the anchor, the four benefits, the six area links, the closing band).
- Browser, dark mode at 1568×759: hero, then "Bài học hôm nay" with the streak and the lesson card title above the fold; benefits with the demo card side by side; activities in 3 columns; closing band. At 390 px (iframe): no horizontal scroll (`scrollWidth` 375), every section stacks, the lesson section starts on the first screen. Light and dark wordmarks both go blue → purple → pink → orange.
- 2026-11-03 (AC-006): `/profile` checked in the browser at 1568 px and 390 px (no horizontal scroll, `scrollWidth` 375); the home page looks the same as before apart from the "Hôm nay" eyebrow and the chips on its streak and points.
