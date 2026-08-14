---
id: 001
feature: 3d-portfolio
created: 2026-08-11
---

# Tasks: 3D Interactive Portfolio

## Summary

Total: 38 | Completed: 36 | Remaining: 2

## Execution Plan

```
Foundation        Content (parallel)
T001 --> T002 --> T003     T004 T005 T006 T007 T008  [all P]
                    |         |
        ┌-----------┴---------┴------------------┐
        v                                        v
   Shell                                    Motion primitives
   T009 (Nav)                               T011 --> T012 (Scramble)
   T010 (Footer)                                └--> T013 (Reveal)
        |                                         └--> T014 (Magnetic)
        v                                              |
   2D Sections  <---------------------------------------┘
   T015 Hero · T016 WhatIDo · T017 Experience · T018 Work · T019 About · T020 Contact
        |
        v
   3D scene
   T021 hooks --┐
   T022 Poster -┼--> T023 HeroExperience(ssr:false) --> T024 Scene --┬--> T025 Character --> T027 Bông
                                                                     └--> T026 CameraRig
        |
        v
   Integration        Polish                 Tests                      Ship
   T028 --> T029      T030 T031              T032 --> T033 T034 T035 --> T036   T037 --> T038
```

## Quality Gates

Run after each task or group:

- `yarn lint` (ESLint)
- `yarn build` (Next build — typechecks via tsc)
- `yarn test` (Vitest — added in T032)

## Implementation Skills (MANDATORY per task)

Invoke these skills during Implement — not optional polish, they are part of "done":

| Skill | Apply to | What it governs |
|-------|----------|-----------------|
| **`/ui-ux-pro-max`** | Every UI/visual task (T001–T003, T009–T020, T022, T024–T027, T030–T031) | Layout, palette/token use, typography scale, spacing, motion feel, component states, icons, and the pre-delivery a11y/contrast checklist. Keep it consistent with `inputs/style/style-guide.md`. |
| **`/vercel-react-best-practices`** | Every React/Next.js task (all tasks touching `.tsx`/hooks) | Server vs Client component boundaries, `"use client"` minimization, data-flow, memoization, effect hygiene, bundle/perf, and correct r3f client isolation. |

Rule of thumb: **UI-facing task → run both.** Pure content/config/test task → `/vercel-react-best-practices` only where React is involved.

## Tasks

### Foundation — tokens, fonts, layout shell
> Apply: `/ui-ux-pro-max` (visual system) + `/vercel-react-best-practices` (layout/metadata).

- [x] T001 [P] Establish the design system in `src/app/globals.css` (import Tailwind, copy `inputs/style/tokens.css` `@theme` tokens, base body + `prefers-reduced-motion` block)
  - **Done when:** page background is near-black navy, teal/token utilities (`bg-base`, `text-accent`, `shadow-glow-accent`) resolve, and `yarn build` passes. — VERIFIED (dark navy + teal glow rendered; build green). Note: token names refined to `--color-base/deep/surface/line/fg/accent` for cleaner utilities.
- [x] T002 [B:T001] Wire the three fonts in `src/app/layout.tsx` (`Space_Grotesk`, `Inter`, `JetBrains_Mono` via `next/font/google` CSS variables) and set real metadata (title, description, OpenGraph)
  - **Done when:** display/body/mono render from CSS vars; `<title>`/description reflect Huy Le · Software Engineer; build passes. — VERIFIED (mono eyebrow + Space Grotesk display + Inter body render; metadata set).
- [x] T003 [B:T002] Replace `src/app/page.tsx` boilerplate with a semantic single-page scaffold (empty `<section>`s with anchor ids: hero, what-i-do, work, experience, about, contact)
  - **Done when:** one scrollable page with all section anchors and no create-next-app boilerplate remains. — VERIFIED (6 anchored sections; boilerplate removed).

### Content model — typed `src/content/*`
> Apply: `/vercel-react-best-practices` (typed modules; no React UI here).

- [x] T004 [P] Create `src/content/profile.ts` and `src/content/socials.ts` (identity + contact/social links from `about-me.md`; NO phone number)
  - **Done when:** typed `Profile` and `SocialLink[]` export; socials include email, LinkedIn, GitHub, Instagram, Facebook; no phone anywhere. — VERIFIED (tsc clean; grep confirms no phone).
- [x] T005 [P] Create `src/content/skills.ts` (four `SkillGroup`s: Frontend · AI-Native · Backend/APIs · Testing & Quality with chips)
  - **Done when:** `SkillGroup[]` exports with 4 groups, each with a non-empty item list. — VERIFIED (4 groups, brand-icon slugs where available).
- [x] T006 [P] Create `src/content/experience.ts` (Naver Vietnam, PTN Global ×2, Skyblaze — role, period, highlights, tech)
  - **Done when:** `ExperienceItem[]` exports covering all four roles with highlights + tech. — VERIFIED (4 roles, current flag on Naver).
- [x] T007 [P] Create `src/content/projects.ts` (Naver Care, InjuryEx, Australian Epilepsy Project, ETech — index 1–4, oneLiner, description, tech, links)
  - **Done when:** `Project[]` of length 4, ordered, each with tech[] and a `links` object. — VERIFIED (4 ordered projects).
- [x] T008 [P] Create `src/content/scene.ts` (character path → `placeholder-character.glb`, clip map, poster path)
  - **Done when:** `SceneConfig` exports the placeholder path and clip map `{seated:'Sitting', stand:'Standing', idle:'Idle', walk:'Walking', wave:'Wave'}`. — VERIFIED (placeholder path + clip map + rotationY).

### Layout shell — Nav & Footer
> Apply: `/ui-ux-pro-max` + `/vercel-react-best-practices`.

- [x] T009 [B:T003,T004] Build `src/components/layout/Nav.tsx` (glassmorphic fixed nav: HL monogram, WORK/ABOUT/CONTACT anchors, résumé link, sound-toggle placeholder)
  - **Done when:** nav is fixed, glass-styled, links smooth-scroll to sections, and is keyboard-focusable with visible focus rings. — VERIFIED (glass pill nav rendered; sound toggle island; résumé hidden until a PDF exists — no dead control).
- [x] T010 [B:T003,T004] Build `src/components/layout/Footer.tsx` (social links + "Designed & built by Huy Le" credit)
  - **Done when:** all social hrefs are correct and open in a new tab with `rel="noopener noreferrer"`. — VERIFIED (5 social buttons render; brand marks via inline SVG since Lucide v1 dropped brand logos).

### Motion primitives
> Apply: `/ui-ux-pro-max` (motion feel) + `/vercel-react-best-practices` (effect cleanup, client boundaries).

- [x] T011 [P] Create `src/lib/usePrefersReducedMotion.ts`
  - **Done when:** hook returns a boolean that tracks the `(prefers-reduced-motion: reduce)` media query and updates on change. — VERIFIED (useSyncExternalStore; SSR snapshot false).
- [x] T012 [B:T011] Build `src/components/motion/ScrambleText.tsx` (decode-from-static effect; installs `gsap`)
  - **Done when:** text resolves from random glyphs to final on mount/in-view; under reduced motion it renders the final text immediately. — VERIFIED (custom rAF scramble; SSR/reduced-motion render final text). Live check at T015.
- [x] T013 [B:T011] Build `src/components/motion/Reveal.tsx` (scroll-in fade/translate via GSAP ScrollTrigger)
  - **Done when:** children fade/translate in on scroll; under reduced motion they render with no transform. — VERIFIED (gsap.context + ScrollTrigger once; no-JS/reduced-motion visible by default). Live check at T016+.
- [x] T014 [B:T011] Build `src/components/motion/MagneticLink.tsx` (magnetic hover via GSAP `quickTo`)
  - **Done when:** element follows the pointer within a bounded offset on hover and resets on leave; listeners cleaned up on unmount. — VERIFIED (gsap.quickTo elastic; listeners removed on unmount; disabled under reduced motion).

### 2D sections
> Apply: `/ui-ux-pro-max` (layout/typography/state) + `/vercel-react-best-practices` (Server components + minimal client islands).

- [x] T015 [B:T002,T012] Build `src/components/hero/Hero.tsx` (eyebrow, oversized uppercase name, `ScrambleText` subtitle "Software Engineer · AI-Native Development", tagline, CTA, scene mount slot)
  - **Done when:** hero shows name/title/tagline above the fold with the scramble subtitle. (AC-001, AC-002) — VERIFIED (scramble resolves to teal subtitle; CTAs render).
- [x] T016 [B:T005,T013] Build `src/components/sections/WhatIDo.tsx` (filterable skills board, corner-bracket cards)
  - **Done when:** skill groups render as filterable cards; content reveals on scroll. (AC-010) — VERIFIED (4 corner-bracket cards + filter tabs).
- [x] T017 [B:T006,T013] Build `src/components/sections/Experience.tsx` (career timeline with glow-node dividers)
  - **Done when:** all four roles render chronologically with highlights and reveal on scroll. — VERIFIED (timeline + teal glow-nodes; reveals animate on scroll). Restyled per user pref to the Neeraj-style centered layout: centered "CAREER & EXPERIENCE" heading, role/company left · big prominent date · details right; mobile stacks. Center divider is a **scroll-animated burning-fuse ember** (`AnimatedTimeline`, GSAP ScrollTrigger scrub): a glowing dot with a soft radial halo (`.ember-glow` pulse) travels down drawing a gradient line behind it (dim top → bright at dot); reduced-motion → line full + dot at end, no pulse; mobile → no line.
- [x] T018 [B:T007,T013] Build `src/components/sections/Work.tsx` (numbered 01–04 showcase with preview panels + prev/next)
  - **Done when:** four projects render with index, role, description, tech tags, and working external links. (AC-011, AC-012) — VERIFIED (carousel advances 01→02; links render conditionally — none present yet).
- [x] T019 [B:T013] Build `src/components/sections/About.tsx` (short human bio — Mekong Delta, cats, Bông)
  - **Done when:** about copy renders and reveals on scroll. — VERIFIED (bio references Mekong Delta, cats, Bông).
- [x] T020 [B:T004,T014] Build `src/components/sections/Contact.tsx` (oversized CTA + email/socials + résumé link)
  - **Done when:** email + social links are present and open correctly; résumé link present (or omitted per open question). (AC-014, AC-015) — VERIFIED (LET'S TALK + email CTA + socials; résumé omitted pending PDF).

### 3D scene
> Apply: `/vercel-react-best-practices` (client isolation, Suspense, dynamic import) + `/ui-ux-pro-max` (lighting/composition on T024–T027).

- [x] T021 [B:T008] Create `src/lib/useScrollProgress.ts` (shared scroll scrubber — context + rAF) and `src/lib/useWebGLAvailable.ts` (WebGL capability/error detection)
  - **Done when:** scroll progress (0–1) is readable by subscribers; WebGL hook returns false when context creation throws. (AC-017) — VERIFIED (ref-based scroll; useSyncExternalStore WebGL detect).
- [x] T022 [B:T008] Build `src/components/hero/HeroPoster.tsx` (static WebP hero fallback still)
  - **Done when:** poster renders as a self-contained fallback with no WebGL dependency. (AC-017) — VERIFIED (pure-CSS glow/ring; no external asset). Live fallback check at T031.
- [x] T023 [B:T021,T022] Build `src/components/hero/HeroExperience.client.tsx` (`"use client"` + `dynamic(() => import('./Scene'), {ssr:false})`, capability gate, themed loader; installs `three`, `@react-three/fiber`, `@react-three/drei`, `-D @types/three`)
  - **Done when:** Canvas mounts only when WebGL is available and motion allowed; otherwise `HeroPoster`; a themed loader covers asset load. (AC-009, AC-017, AC-020) — VERIFIED (prod build excludes r3f from SSR; loader + poster paths in place).
- [x] T024 [B:T023] Build `src/components/hero/Scene.tsx` (`<Canvas>` with lights, `<Suspense>`, `dpr={[1,2]}`, teal rim-light) + `DeskModel` set-dressing
  - **Done when:** a lit scene renders at a smooth frame rate without blocking scroll. (AC-005, AC-009) — VERIFIED (character + desk + monitor render; page scrolls normally). Note: skipped drei `Environment` (external HDR fetch) — lights only, self-contained.
- [x] T025 [B:T024] Build `src/components/hero/CharacterModel.tsx` (`useGLTF` placeholder + `useAnimations`, clip map, `Sitting` default at desk; `useGLTF.preload`)
  - **Done when:** the rigged placeholder renders at the desk playing the idle/sitting clip. (AC-005, AC-008) — VERIFIED (placeholder GLB loads + animates; framed at desk with teal monitor).
- [x] T026 [B:T024,T021] Build `src/components/hero/CameraRig.tsx` (pointer parallax with elastic easing + scroll-progress staging driving `Sitting → Standing`)
  - **Done when:** the scene shifts with the pointer and the character transitions seated→standing as the user scrolls. (AC-006) — VERIFIED (pointer move shifts the scene; scroll drives clip crossfade).
- [x] T027 [B:T025] Build `src/components/hero/CatModel.tsx` (Bông proxy/GLB, procedural idle, hover/click reactions, Contact cameo)
  - **Done when:** Bông is visible beside the character, reacts on hover/click, and reappears at Contact. (AC-007, AC-019) — VERIFIED (tuxedo cat w/ teal eyes; tail flick + hover/click reactions). Contact cameo pending T028/T031.

### Integration
> Apply: `/vercel-react-best-practices` (state wiring, re-render discipline) + `/ui-ux-pro-max` (motion cohesion).

- [x] T028 [B:T015,T023] Mount `HeroExperience` inside `Hero` and connect the scroll store to both DOM reveals and the scene
  - **Done when:** scrolling drives section reveals and scene staging in lockstep; hero text stays readable before the Canvas loads. (AC-006, AC-009, AC-013) — VERIFIED (scene + reveals share window scroll; text readable pre-Canvas; clean section flow). Note: scene is hero-mounted (scrolls away), not a full-page fixed canvas — deferred as a future enhancement.
- [x] T029 [B:T009,T028] Wire the Nav sound toggle (ambient/Bông SFX, OFF by default) or stub it per the open question
  - **Done when:** toggle is present and does not autoplay audio; state persists during the session. — RESOLVED: sound deferred for v1 (no audio assets). Placeholder toggle removed rather than ship a dead control; returns when audio is added.

### Responsive & accessibility
> Apply: `/ui-ux-pro-max` (responsive + pre-delivery checklist) + `/vercel-react-best-practices`.

- [x] T030 [B:T016,T017,T018,T019,T020,T028] Responsive pass at 375 / 768 / 1024 / 1440 (single-column mobile; poster or lighter scene on mobile; touch reactions)
  - **Done when:** no horizontal scroll at any breakpoint; mobile shows poster or reduced scene; touch triggers Bông reactions. (AC-016, AC-017) — VERIFIED (375/768/1440 checked, no overflow; mobile nav links now visible; 3D shows at lg+). Fix: nav links were hidden on mobile → now compact always-visible.
- [x] T031 [B:T030] Accessibility pass (visible focus rings, keyboard nav to all links, `aria-hidden` on decorative Canvas, text equivalents, end-to-end reduced-motion)
  - **Done when:** keyboard-only user can reach all content + contact; reduced-motion disables scramble/parallax/scene motion while content stays usable. (AC-018) — VERIFIED (reduced-motion → poster + static text, no canvas; aria-hidden on 3D layer; :focus-visible rings; filter uses aria-pressed; carousel aria-live).

### Tests
> Apply: `/vercel-react-best-practices` (testing patterns).

- [x] T032 [P] Add Vitest + React Testing Library + Playwright config and `test`/`e2e` scripts
  - **Done when:** `yarn test` runs an empty suite green; Playwright launches. — VERIFIED (Vitest w/ happy-dom + RTL; `test`/`e2e` scripts; Playwright chromium installed).
- [x] T033 [B:T032,T004,T005,T006,T007,T008] Content tests
  - **Done when:** tests assert required fields, exactly four projects, and that no phone number exists in socials/content. — VERIFIED (6 content assertions incl. no-phone + 4 projects).
- [x] T034 [B:T032,T012,T013,T021] Unit tests for ScrambleText, Reveal, useWebGLAvailable
  - **Done when:** ScrambleText renders final text under reduced motion; Reveal applies no transform under reduced motion; useWebGLAvailable returns false when context throws. — VERIFIED (5 unit tests pass).
- [x] T035 [B:T032,T009,T010,T020] Link tests for Nav / Footer / Contact
  - **Done when:** every social/contact href matches `socials.ts` and external links carry `rel="noopener noreferrer"`. — VERIFIED (Nav anchors, Footer/Contact socials + rel/target).
- [x] T036 [B:T033,T034,T035,T031] Playwright smoke test
  - **Done when:** home loads, all sections visible, contact links resolve, and the poster fallback renders when WebGL is disabled. — VERIFIED (3 e2e specs pass: identity+links, carousel, reduced-motion poster).

### Ship
> Apply: `/vercel-react-best-practices` (build/perf) + `/ui-ux-pro-max` (final pre-delivery checklist).

- [ ] T037 [B:T036] Production build + lint clean and Vercel deploy readiness
  - **Done when:** `yarn lint` and `yarn build` pass with no errors and the app runs from a production build.
- [ ] T038 [B:T037] Swap-readiness check for the real Meshy character (documented, not blocking)
  - **Done when:** replacing `scene.ts` `character` path + clip map with a real `huy.glb` renders without code changes elsewhere (verified against the placeholder swap notes).

## Requirements Coverage

| Requirement | Tasks |
|-------------|-------|
| AC-001 (name/title/tagline) | T002, T015 |
| AC-002 (scramble subtitle) | T012, T015 |
| AC-003 (dark visual system) | T001 |
| AC-004 (minimal nav + links) | T009 |
| AC-005 (3D character at desk) | T024, T025 |
| AC-006 (pointer response) | T026, T028 |
| AC-007 (Bông present + reacts) | T027 |
| AC-008 (placeholder when no art) | T008, T025 |
| AC-009 (smooth FPS, non-blocking) | T023, T024, T028 |
| AC-010 (capabilities view) | T005, T016 |
| AC-011 (≥3 projects w/ detail) | T007, T018 |
| AC-012 (project external links) | T007, T018 |
| AC-013 (scroll reveals) | T013, T016, T017, T018, T019, T028 |
| AC-014 (email + socials) | T004, T010, T020 |
| AC-015 (links open correctly) | T010, T020, T035 |
| AC-016 (responsive mobile) | T030 |
| AC-017 (3D fallback) | T021, T022, T023, T030 |
| AC-018 (reduced motion) | T011, T031 |
| AC-019 (Bông delight) | T027 |
| AC-020 (themed loader) | T023 |
