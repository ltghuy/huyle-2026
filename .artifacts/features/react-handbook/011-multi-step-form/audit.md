---
id: "011"
feature: multi-step-form
audited: 2026-10-08
result: passed
---

# Audit: Multi-Step Form

Evidence from three sources. Shared rules, step logic and the draft were checked with Node scripts (jiti) against the real modules; the API with a fetch script against the dev server; the UI on the dev server in headless Chrome (Puppeteer MCP, visible page). Keyboard input was emulated as in feature 009: Tab moves to the next focusable element in document order (skipping disabled, hidden and `tabindex="-1"` elements), Space clicks, Enter clicks a button or submits the form from a field, typing sets the value with input events. Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: Step by step, never past an invalid step, back to any completed step without loss | Met | Next on an empty step stays, shows 3 errors and focuses the summary; errors appear on leaving a field and update while typing; Back, the progress list and Edit keep every answer (see SC1, SC2) |
| G2: Steps adapt; progress, navigation and review match; non-applicable answers not submitted | Met | Step count 5 → 6 → 7 with Engineering and sponsorship; Design swaps the step; a valid step behind an unfinished one shows locked, a broken one "needs attention"; see SC6 |
| G3: Nothing lost to reload, closing, Back/Forward | Met | Draft saved 422 ms after a change; see SC2; v1 draft migrated, corrupted draft discarded with a note; blocked storage warns once, shows "Not saved" and guards leaving (`beforeunload` prevented) |
| G4: Server is the final authority; rejections land on their step and field | Met | See SC4 and SC5; email check: one request for a burst of typing, a newer value cancels the old request, a taken email blocks Next, Next waits for a pending check, a failed check retries and then blocks |
| G5: The learner can see values, visited fields and errors as they change | Met | Inspector shows applicable steps, furthest step, tried steps, requests, values, rule errors (count), visited fields and server errors; typing and leaving a field updated Values and Visited immediately |
| SC1: Keyboard-only run (Engineering, sponsorship, 2 jobs) submits, focus never on the body | Met | Emulated keyboard run from the first heading to the confirmation (APP-1005): radio groups one Tab stop each, Space selects; Add job focuses the new job's company; Move up keeps focus on that job's other move button; Enter in a field submits the step; 6 Edit buttons, consent, Submit; 0 times focus on `<body>`; every step change focused the step heading |
| SC2: Reload on every step and Back/Forward across all steps restore 100% of values and the step | Met | Reload on each of 7 steps: same step and inspector values identical (7/7). Next through 7 steps, Back ×6 and Forward ×6: addresses in order, focus on the heading each time, values identical |
| SC3: Deep links to non-reachable steps land on the furthest allowed step without a history entry | Met | Draft reaching Experience; addresses for Review, Engineering (past furthest), Design (not applicable), Extras, Work authorization and an unknown step all showed Experience; with `pushState`/`replaceState` wrapped, the app made 0 `pushState` calls (corrections use `replaceState`); direct page loads of 5 such addresses also landed on Experience |
| SC4: 0 invalid applications accepted; ≥ 20 tampered requests rejected with step and field | Met | 24 tampered bodies → 422, each issue with step and path (missing steps, non-applicable Design, unknown step, unknown field, unknown job field, wrong types, invalid/used email, unknown country/role, past start, 6 jobs, end before start, 6 languages, years 99 and as a number, `javascript:` link, 3,000-char letter, inverted salary, consent false, cross-step rule, array body); bad JSON 400; resubmitting an accepted email → 422 on `personal.email` |
| SC5: Every server field error on the correct step and field | Met | 14 injected 422 responses covering every step (fields, a list, a job inside the list, consent): 13 opened the right step with the message on the field and in the summary (two issues → earliest step); the unplaceable one (unknown key) showed on Review as a failure message (fixed during verification, it was silent before); real outcomes: "reject field" → Experience company, "email used" → Personal email |
| SC6: 10 role switches leave Review, draft and submission with the current role only | Met | 10 switches ending on Design: draft steps, Review groups and the posted body each contain Design and no Engineering; the application was accepted |
| SC7: 0 serious/critical a11y issues, both themes, 360 px without sideways scroll | Met | axe-core 4.10.2 at 360 px, light and dark: 0 violations on every step and the error state (after making the inspector's scrollable blocks focusable); at 1280 px only the moderate `region` from feature 001; `scrollWidth` 360 on Personal, Experience and Review; nav buttons 44 px tall |

## Known minor issues (not blocking)

- Keyboard was emulated (the Puppeteer MCP has no real key presses; `puppeteer_fill` inserts text). Arrow keys in Base UI radio groups moved focus but a dispatched ArrowRight didn't select; Space selects, so every choice stays keyboard operable. Arrow selection with a real keyboard is unverified.
- Reduced motion (static spinners via `motion-reduce`) checked by reading the code only.
- "Needs attention" isn't kept across a reload: which steps were tried is visit state, so after a reload a broken later step shows as not finished.
- axe `region` (moderate) on the page itself, carried over from feature 001.
