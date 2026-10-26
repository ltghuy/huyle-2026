---
topic: learn-english-srs-and-tour
researched_at: 2026-10-26
version: "ts-fsrs 5.4.2 (latest) / 6.0.0-beta.15 (beta); driver.js 1.10.2; react-joyride 3.2.0; nextstepjs 2.3.0; onborda 1.2.5; shepherd.js 15.3.0 / react-shepherd 7.0.6; @diceui/tour (registry, unversioned); input-otp 1.5.0"
sources_hash: "n/a"
ttl_days: 90
keywords: [fsrs, ts-fsrs, spaced-repetition, sm-2, srs, rating, daily-limit, backlog, retrievability, product-tour, driver.js, react-joyride, nextstepjs, onborda, shepherd, diceui-tour, onboarding, a11y, focus-trap, vietnamese-ime, telex, vni, unikey, fill-in-letters, input-otp, autocorrect, autocapitalize, spellcheck, inputmode, cloudflare-workers]
---
# Spaced repetition (FSRS), guided tours and letter-input UX for the English-learning app

> Researched: 2026-10-26

Target stack: Next.js 16.3 App Router, React 19.2, Tailwind v4, shadcn/ui `base-nova` on `@base-ui/react` ^1.8, OpenNext on Cloudflare Workers (same as `apps/react-handbook`).

## Summary

- **SRS:** use **FSRS via `ts-fsrs`**, MIT. The npm `latest` tag is **5.4.2**, which runs the FSRS-6 model. A **v6 line (`6.0.0-beta.15`, 2026-10-19)** is in beta. It renames the whole API to camelCase, adds FSRS-7 as the default model and requires Node >= 24. Pin 5.4.2 now and keep the scheduler behind one small module so the v6 move touches only that module. The package is pure JS with no Node built-ins, so it works on Workers or in the browser. Minified + gzipped it is about 7.3 kB.
- **Grading:** FSRS does not use response time. Map wrong to `Again` and correct to `Good`. Use `Hard` only for "correct but with a hint, a retry or a typo" and `Easy` only for "correct, first try, clearly fast". When unsure, use the plain pass/fail mapping.
- **Daily cap:** enforce a max-reviews/day limit in the app, since ts-fsrs has none. For a backlog, serve due cards by **ascending retrievability**, pause new cards while behind and turn on `enable_fuzz`.
- **Tour:** prefer **`@diceui/tour`**. It is a shadcn-registry component built on `@base-ui/react` and `@floating-ui/react-dom`, so it matches base-nova, uses Tailwind and is copied into the repo as code. Fallback is **driver.js 1.10.2** (MIT, about 8 kB gzipped, no dependencies, has a real focus trap, ARIA dialog and keyboard support). react-joyride 3.2.0 is a fine third option. Avoid Shepherd (AGPL-3.0) and Onborda (unmaintained since 2024-12).
- **Letter input:** use one real `<input>` with visual slots (the `input-otp` / shadcn `InputOTP` pattern). Set `autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" lang="en"`, don't fight composition events, normalise Vietnamese-IME output back to ASCII before grading, and show a "turn off Vietnamese typing" hint when non-ASCII letters show up.

## Key Information

### A1. ts-fsrs facts (verified from the npm tarball for 5.4.2 and the GitHub README)

| Item | Value |
|---|---|
| Package / license | `ts-fsrs`, MIT, repo `open-spaced-repetition/ts-fsrs` |
| Stable | **5.4.2** (`latest` dist-tag). `FSRSVersion` = "v5.4.2 using FSRS-6.0" |
| Next | **6.0.0-beta.15** (`beta` tag, 2026-10-19). Default model FSRS-7. `engines.node >= 24`. Subpath exports `./reschedule`, `./middlewares` |
| Dependencies | none (5.4.2) |
| Formats | ESM `dist/index.mjs`, CJS, UMD, `index.d.ts` |
| Size | 5.4.2 ESM 61 kB raw / 13.4 kB gz unminified; **22.9 kB min / 7.3 kB min+gz** (esbuild, whole lib) |
| Runtime | No `process`, `Buffer`, `require` or `node:` imports in the dist. Only `console.debug` and `Date`. Safe on Workers (V8 isolates), in the browser or in RSC. `engines.node >=20` is metadata only |

**v5 API (5.4.2):**

```ts
import { fsrs, generatorParameters, createEmptyCard, Rating, State, type Card, type Grade } from 'ts-fsrs'

const params = generatorParameters({
  request_retention: 0.9,   // default 0.9
  maximum_interval: 365,    // default 36500 days
  enable_fuzz: true,        // default false
  enable_short_term: true,  // default true; false = learning steps ignored, FSRS schedules everything
  learning_steps: ['1m', '10m'],  // default ['1m','10m']; units m|h|d
  relearning_steps: ['10m'],      // default ['10m']
  // w: default_w (21 FSRS-6 weights); only set after optimising
})
const f = fsrs(params)

const card = createEmptyCard(new Date())        // state New, due now
const preview = f.repeat(card, now)             // all 4 outcomes: preview[Rating.Good].card / .log
const { card: next, log } = f.next(card, now, Rating.Good)  // one grade
f.get_retrievability(next, now, false)          // number 0..1
f.rollback(next, log)                           // undo
f.forget(next, now, /*reset_count*/ false)      // reset to New
f.reschedule(card, history, opts)               // replay history after param change
```

- `Rating` enum: `Manual=0, Again=1, Hard=2, Good=3, Easy=4`. `Grade` excludes `Manual`. `Grades` is a readonly array.
- `State` enum: `New=0, Learning=1, Review=2, Relearning=3`.
- **Card fields to persist** (5.4.2 `Card`): `due`, `stability`, `difficulty`, `elapsed_days` (deprecated, removed in 6.0), `scheduled_days`, `learning_steps`, `reps`, `lapses`, `state`, `last_review?`.
- **ReviewLog fields:** `rating`, `state`, `due`, `stability`, `difficulty`, `elapsed_days` (deprecated), `last_elapsed_days` (deprecated), `scheduled_days`, `learning_steps`, `review`. Keep the logs. They are needed for `rollback`, `reschedule` and later parameter optimisation (`@open-spaced-repetition/binding`, a separate package).
- `CardInput` accepts `state` as the enum or a string, and dates as `Date | number | string`. You can feed DB rows straight in, but you need to rehydrate dates.
- Fuzz is deterministic per card via a seed strategy (`GenSeedStrategyWithCardId(field)` seeds from your card id).

**v6 changes (migration guide, beta):**
- `fsrs()`/`createEmptyCard`/`generatorParameters` become `defineScheduler({ model, chrono }).use(middleware).create({ config })` or `await DefaultScheduler()`.
- `next` becomes `review`, `repeat` becomes `preview`, `createEmptyCard` becomes `newCard`, `get_retrievability` becomes `model.forgettingCurve`, and `{card, log}` becomes `{card, revlog}`.
- camelCase everywhere: `due` to `dueAt`, `last_review` to `lastReviewAt`, `scheduled_days` to `scheduledDays`, `request_retention` to `desiredRetention`, `enable_fuzz` to `enableFuzz`, `maximum_interval` to `maximumInterval`. New `cardId` and `scheduleStatus`. `elapsed_days` is removed.
- A bare v6 definition **does not** apply retention, fuzz or max-interval policies until you add the middleware. `clearStatsOnForget` defaults to true.
- FSRS-6 can still be used with `FSRS6Model` and existing 21 weights. FSRS-7 adds `stabilityFast` to the memory state.

### A2. Rating mapping for auto-graded exercises

- FSRS takes **no answer-time input**. Time is used only in simulations (forum, unofficial). Any time-to-grade logic is our own heuristic.
- Anki manual: **Hard is a passing grade**. Using Hard for forgotten items produces intervals that are too long. Use Again for any failure. The FSRS health check flags "misuse of Hard" and "not pressing Again".
- Community consensus (Anki forums): correct is Good and incorrect is Again. Hard and Easy are optional refinements, and pass/fail grading works with FSRS.
- Suggested mapping for this app (our design, built from the above):

| Outcome | Rating |
|---|---|
| Wrong, gave up, or revealed answer | `Again` |
| Correct after a retry / hint / with a typo accepted / extremely slow (> ~3x the user's median for that exercise type) | `Hard` |
| Correct, first attempt | `Good` |
| Correct, first attempt, fast (< ~0.5x user median for that exercise type **and** card already in Review state) | `Easy` (optional; leave it off for v1) |

  Normalise time **per exercise type and per user** (rolling median), because typing a word takes longer than a multiple-choice tap. Cap outliers, for example a tab left in the background. Never derive `Again` from time alone.

### A3. SM-2 vs FSRS

- SM-2 has a fixed ease factor and multiplier, cannot predict recall probability and has no notion of desired retention.
- FSRS models difficulty, stability and retrievability per card, targets a chosen retention and can be optimised from logs.
- srs-benchmark (open-spaced-repetition, about 10k Anki collections, 350M+ evaluation reviews): FSRS-6 log loss is 0.3460 and RMSE(bins) 0.0653, better than FSRS-5 (0.3561 / 0.0742). An Anki forum post cites FSRS-5 beating a trainable SM-2 variant for **97.4% of users**. That figure is secondhand, see Uncertainties.
- Why not SM-2: there is no retention target and no retrievability for ordering a backlog, and the only effort saving is about 50 lines of code. ts-fsrs is about 7 kB and is maintained. SM-2 is still acceptable as a fallback, and ts-fsrs v6 has SM-2 conversion helpers (`memoryStateFromSM2` in the binding).

### A4. Daily caps and backlog (Anki manual guidance, applied)

- ts-fsrs schedules single cards only. **Limits and ordering belong to the app.**
- New cards/day drives future load. Anki estimates that about 20 new cards a day leads to about 200 reviews a day. Missed days do not add extra allowance.
- Max reviews/day smooths peaks after a break. Interday learning cards count toward the limit.
- When there is a backlog: **pause new cards** until caught up, and order due cards by **ascending retrievability** (the FSRS replacement for "relative overdueness"). Items most likely forgotten come first.
- Desired retention: 0.9 is the default. Workload grows fast above 0.9, so stay below 0.97. Lower values such as 0.85 reduce load.
- Learning steps: keep each step under 1 day (for example `1m`, `10m`) and finishable the same day. Steps of a day or longer are discouraged with FSRS.
- `enable_fuzz: true` spreads cards that would otherwise all fall due on the same day. Anki's load balancer and Easy Days are app-level features that ts-fsrs does not have (not verified on this page).

### B. Guided tour libraries (verified versions from npm on 2026-10-26)

| | driver.js | react-joyride | nextstepjs (NextStep) | onborda | shepherd.js / react-shepherd | @diceui/tour |
|---|---|---|---|---|---|---|
| Version | 1.10.2 (2026-10-18) | 3.2.0 (2026-07-09) | 2.3.0 (2026-07-20) | 1.2.5 (**2024-12-22**) | 15.3.0 / 7.0.6 (2026-08-24) | shadcn registry item (no semver) |
| License | MIT | MIT | MIT | MIT | **AGPL-3.0** (commercial licence sold separately) | MIT (Dice UI) |
| React 19 | framework-agnostic (vanilla DOM) | peer `react 16.8 - 19` | peer `react >=18` | peer `react >=18` | peer `^18 \|\| ^19` | built on `@base-ui/react` |
| Deps | none | 10 (floating-ui, deepmerge, …) | peer `motion`, `next` (optional), router adapters | peer `framer-motion`, `@radix-ui/react-portal`, `next` | `@floating-ui/dom`, `deepmerge-ts` | `@base-ui/react`, `@base-ui/utils`, `@floating-ui/react-dom` |
| Size (min+gz, own code) | **8.0 kB JS + 1.1 kB CSS** | ~15 kB (deps excluded) | ~66 kB raw dist (not minified) | 479 kB unpacked | 814 kB unpacked | ~48 kB source TSX, compiled into your bundle |
| Focus trap | yes: Tab/Shift+Tab cycle popover + highlighted element. Focuses first control. Restores previous focus on destroy | yes (disable with `disableFocusTrap`). Restores focus | **none found** in dist | unknown | yes (per its docs; not re-verified) | yes: focus guards + Tab cycling (Radix-style). Restores focus |
| Keyboard | Esc close, ←/→ prev/next (`allowKeyboardControl`) | Esc (`dismissKeyAction`: close/next/false) | Esc, ←/→ | unknown | yes | Esc (`onEscapeKeyDown`), Tab, Enter/Space |
| ARIA | popover `role="dialog"` + `aria-labelledby/-describedby`. Target gets `aria-haspopup/expanded/controls` | tooltip `role="alertdialog"`, `aria-modal`, beacon `aria-label` | no `aria-*` in dist (grep) | unknown | yes (docs) | `aria-label` on close/prev/next/skip. **No `role` on content** (add `role="dialog"` yourself) |
| Missing/hidden target | renders popover **centred on screen** (dummy element). `skipMissingElement` skips it. `waitForElement: ms` waits via MutationObserver | error event / target-not-found (v3 docs; details not read) | unknown | unknown | unknown | step content **not rendered** unless `forceMount`. `hideWhenDetached` hides when target is scrolled out |
| Theming | `popoverClass` + `onPopoverRender(popover)` to inject classes. Ships its own CSS to override | `options`/`styles` object + custom tooltip component | custom `cardComponent` (Tailwind OK) | custom card | CSS classes | **Tailwind classes in owned code** |
| SSR | client-only. Call inside `useEffect` / event handler. Touches `window`/`document` only when called | claims SSR-safe | client component | client | client | `"use client"` component |

- driver.js 1.10 also ships `hints` (about 5.2 kB gz) and `checklist` (about 2.7 kB gz) entry points, and places its popover inside an open `<dialog>` top layer when the target is in one.
- driver.js sets `title`/`description` with **`innerHTML`**. Pass only trusted static strings.
- No official shadcn/ui tour exists. Dice UI is a third-party shadcn registry (`npx shadcn@latest add @diceui/tour`). Others (shadcn.io block, 21st.dev items) are unaffiliated and some require API keys.

### C. Fill-in-missing-letters input

- **Single input vs per-letter boxes:** OTP guidance from Tabler, MiHCM and Cloud Four favours **one real input with visual slots**. Screen readers announce one field rather than "1 of 6", paste and autofill work, and caret handling is simpler. Per-box inputs need auto-advance and backspace chaining, and some Android keyboards fire input events unreliably with `maxlength=1` (single secondary source). Twilio notes multi-box is common for showing length.
- `input-otp` 1.5.0 (MIT, peer React 16.8–19) implements the single-hidden-input-with-slots pattern. shadcn `base-nova` ships an `InputOTP` wrapper (deps `cn`, `input-otp`). It accepts a `pattern` regex, so for letters use something like `^[a-zA-Z]+$`.
- **Attributes:**
  - `autocorrect="off"` is now Baseline 2026 per MDN. It is forced off for password/email/url types and inherits from `<form>`.
  - `autocapitalize="none"` and `spellcheck="false"` stop the keyboard from capitalising and the browser from flagging misspellings.
  - `autocomplete="off"` stops autofill suggestions.
  - `lang="en"` sets the spellcheck/hyphenation language and helps assistive tech. It does **not** switch the user's IME.
- **`inputmode`** values are only `none, text, decimal, numeric, tel, search, email, url`. **None of them selects a Latin-only keyboard**, and `text` uses the current locale keyboard. `inputmode="none"` hides the OS keyboard. That only helps if we draw our own on-screen letter keyboard, which is a valid option for mobile.
- **Vietnamese Telex/VNI:**
  - IMEs such as UniKey, EVKey, Windows/macOS built-in Telex, and Gboard or Laban Key in Vietnamese mode turn sequences into accented letters: `aa→â, aw→ă, ee→ê, oo→ô, ow→ơ, uw→ư, dd→đ`, plus tone keys `s f r x j` (Telex) or digits `1–9` (VNI).
  - Desktop Telex commonly works by **sending a Backspace and then the composed character**. A Windows bug report says it sends 0x08. This has not been confirmed against UniKey source.
  - Fast typing in React controlled inputs is reported to garble accents and make the caret jump (NocoBase report), which points to re-renders during IME composition.
  - No web attribute can turn off a desktop OS IME. CSS `ime-mode` is deprecated and non-standard (MDN page has moved; not usable).
  - English words that hit Telex rules get mangled, for example "book" becomes "bôk" and "see" becomes "sê". Tone keys appear in English letters too: s, f, r, x, j.

## Implementation Notes

**SRS module** (`lib/srs.ts`, server-side or shared):
- Wrap ts-fsrs in `schedule(cardRow, outcome, now) -> { cardRow, log }` and `previewIntervals(cardRow, now)`. Nothing else imports `ts-fsrs`, which keeps the v6 migration local.
- DB columns: `due` (timestamp, index it with user_id), `stability` real, `difficulty` real, `scheduled_days` int, `learning_steps` int, `reps` int, `lapses` int, `state` smallint, `last_review` timestamp null. Also store `elapsed_days` while on v5. Add a `review_logs` table with all log fields plus `card_id`, `user_id`, `duration_ms` and `exercise_type`.
- Create the scheduler once at module scope (`fsrs(params)`). It is cheap, stateless per call and safe to share across Worker requests.
- Daily queue query: due cards where `due <= now` for the user, then compute `get_retrievability` in JS and sort ascending. Take `min(maxReviewsPerDay - doneToday, …)`, then add new cards only if `reviewsDueRemaining == 0` or below a threshold. "Today" must be computed in the **user's timezone**, with a day rollover hour such as 4 am like Anki.
- Learning-step cards (minutes) can be due within the same session. Re-queue them in the client session instead of waiting for the next page load.

**Tour:**
- `npx shadcn@latest add @diceui/tour`. Render it in a client component mounted from the layout, and start it after hydration (`useEffect`), only when a `tourSeen` flag in localStorage is false (wrap reads in try/catch).
- Give each target a stable `data-tour="…"` attribute. On mobile, where a nav item may be hidden behind a menu, either point that step to a visible element such as the menu button, use `forceMount` with a centred card, or filter out steps whose target is missing or `display:none` before starting.
- Add `role="dialog"`, `aria-labelledby` and `aria-describedby` to the step content. Respect `prefers-reduced-motion` for scrolling (Dice uses a scroll-behavior default helper; check it).
- With driver.js instead: `import { driver } from 'driver.js'` plus `driver.js/dist/driver.css` inside a client component. Set `popoverClass` to a class that restyles with Tailwind tokens, use `skipMissingElement: true` or `waitForElement: 1500`, and call `driverObj.destroy()` on unmount and route change.

**Letter input:**
- One `<input type="text">` (or `InputOTP` with `maxLength = gaps`) with `autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" lang="en" enterKeyHint="done"`.
- **Do not reformat the value during composition.** Track `compositionstart`/`compositionend` (`e.nativeEvent.isComposing`) and normalise only on `compositionend` or submit.
- Normalise before grading:
  1. `s.normalize('NFD').replace(/[̀-ͯ]/g, '')` strips tones and vowel marks. Then map `đ→d`, `Đ→D`.
  2. Optionally reverse the Telex doubling: compare the user string against the expected answer with a matcher that accepts `â` for `aa`, `ê` for `ee`, `ô` for `oo`, `đ` for `dd`, `ư` for `uw`, `ơ` for `ow`, `ă` for `aw`.
- If the raw value contains `/[^\x00-\x7F]/` or composition fired, show an inline hint: "Looks like Vietnamese typing (Telex/VNI) is on. Switch to English (UniKey/EVKey: Ctrl+Shift or Alt+Z; mobile: change keyboard language)." Grade the normalised value so the user isn't penalised.
- Mobile option: a custom on-screen A–Z keypad with `inputmode="none"`. It avoids IMEs completely and suits letter-gap exercises.

## Gotchas

- `ts-fsrs` `latest` (5.x) and the GitHub README (v6 API) **disagree**. Code samples on GitHub `main` will not compile against 5.4.2. Read the 5.x docs or the `.d.ts`.
- v6 beta requires Node >= 24 in `engines`. The handbook uses `@types/node ^20`, and Workers' nodejs_compat is not the issue. This affects local tooling and CI.
- With v6, retention, fuzz and max interval are opt-in middleware, so forgetting them silently changes scheduling.
- Dates: ts-fsrs returns `Date` objects. Serialise them as ISO strings or epoch ms and rehydrate. `CardInput` accepts both.
- Hard is a pass. Mapping "partially wrong" to Hard inflates intervals, so use Again.
- driver.js uses `innerHTML` for content (XSS risk with user content), and its default CSS uses fixed colours, so it needs dark-mode overrides.
- Onborda has had no release since 2024-12, and its peers are framer-motion and Radix (not Base UI). Shepherd is AGPL-3.0, which is viral for network-served apps unless you buy a licence.
- NextStep dist contains no ARIA attributes and no focus trap (grep of 2.3.0). That is a regression risk for a11y.
- Dice tour returns `null` for a step whose target is missing, which can leave the tour "open" with nothing visible. Guard for it.
- Per-letter boxes with auto-advance plus a desktop Telex IME is a likely conflict. If the IME sends Backspace after focus has moved to the next box, the backspace-to-previous handler may fire. This is untested, see Uncertainties.
- React controlled inputs that rewrite `value` during IME composition break Vietnamese input. Normalise after composition.

## Recommendations

1. **SRS: ts-fsrs 5.4.2, pinned exactly**, wrapped in one module. Params: `request_retention 0.9`, `maximum_interval 365` (a reasonable horizon for a vocab app; tune later), `enable_fuzz true`, `enable_short_term true`, `learning_steps ['1m','10m']`, `relearning_steps ['10m']`. Grade with Again, Good and Hard as in A2, Easy off at launch, and log `duration_ms` for later. Plan the v6 migration once 6.0.0 stable ships.
2. **Daily caps:** new/day 10–20 and max reviews/day 100–200 as user settings. Order the backlog by ascending retrievability and auto-pause new cards while the backlog is above 0. Use the user's timezone with a 4 am rollover.
3. **Tour: `@diceui/tour`**. Its base-ui, floating-ui and Tailwind code is owned, matches base-nova, has a focus trap and React 19 support, and adds no runtime package beyond `@base-ui/utils` and `@floating-ui/react-dom`. Add `role="dialog"` and handle hidden targets. **Fallback: driver.js 1.10.2**, the smallest option with the best verified a11y and no dependencies, themed through `popoverClass`.
4. **Letter gaps:** use one real input with slots (shadcn `InputOTP` with a letters `pattern`) and the attribute set above. Normalise the IME output and show the hint. Consider a custom A–Z keypad on mobile.

## Uncertainties

- The 97.4% "FSRS-5 beats SM-2 trainable" figure comes from a forum post. The srs-benchmark README page fetched did not show SM-2 rows.
- The ts-fsrs 6.0 stable release date is unknown, and so is whether `DefaultScheduler()` is async (the README shows `await DefaultScheduler()`, while migration-guide examples call methods synchronously).
- The rating-from-response-time thresholds (0.5x / 3x median) are our heuristic, not an FSRS recommendation.
- react-joyride v3 target-not-found and SSR details were not read (the "SSR-safe" claim comes from its README). Shepherd a11y was not re-verified for 15.3.0. NextStep's missing-target and mobile behaviour, and Onborda a11y, were not verified.
- Dice tour: no published semver, and focus-trap behaviour was inferred from source (focus guards plus Tab cycling), not tested. No `role` was found in the source.
- Telex mechanism (Backspace + replacement, 0x08 on Windows) comes from a third-party bug report. Whether UniKey resets its buffer when focus moves programmatically between inputs is unknown. Test with UniKey/EVKey on Windows, macOS Telex, Gboard Vietnamese and Laban Key.
- Whether `type="password"` disables IMEs (Windows/macOS secure input) was not verified. It is not recommended anyway because it masks text.
- The Android `maxlength=1` input-event issue comes from a single secondary source.
- Anki load balancer / Easy Days were not covered on the fetched manual page in detail.

## Sources

- https://www.npmjs.com/package/ts-fsrs (npm registry metadata and 5.4.2 tarball inspected)
- https://github.com/open-spaced-repetition/ts-fsrs
- https://github.com/open-spaced-repetition/ts-fsrs/tree/main/packages/fsrs
- https://open-spaced-repetition.github.io/ts-fsrs/guide/migration
- https://github.com/open-spaced-repetition/ts-fsrs/releases
- https://github.com/open-spaced-repetition/srs-benchmark
- https://docs.ankiweb.net/deck-options.html
- https://forums.ankiweb.net/t/how-to-prevent-users-from-misusing-hard-ideas-are-welcome/49092?page=6
- https://forums.ankiweb.net/t/pass-fail-grading-as-default/34147/36
- https://forums.ankiweb.net/t/does-using-all-4-answer-buttons-make-fsrs-more-accurate/70312
- https://forums.ankiweb.net/t/creation-of-new-landing-page/42555?page=3
- https://www.npmjs.com/package/driver.js (1.10.2 tarball inspected)
- https://github.com/gilbarbara/react-joyride
- https://react-joyride.com/docs/migration
- https://react-joyride.com/docs/accessibility
- https://nextstepjs.com/docs (2.3.0 tarball inspected)
- https://www.npmjs.com/package/onborda
- https://www.npmjs.com/package/shepherd.js , https://www.npmjs.com/package/react-shepherd
- https://diceui.com/docs/components/tour , https://diceui.com/r/tour.json
- https://ui.shadcn.com/r/styles/base-nova/input-otp.json , https://www.npmjs.com/package/input-otp
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/autocorrect
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode
- https://www.twilio.com/en-us/blog/developers/best-practices/best-practices-for-otp-input-forms-in-ios
- https://cloudfour.com/thinks/simple-one-time-passcode-inputs/
- https://designsystem.mihcm.com/components/input-otp/accessibility
- https://docs.tabler.io/ui/forms/otp-input
- https://dev.to/wdsega/component-deep-dive-35-otp-input-auto-advance-paste-and-backspace-chaining-3ap
- https://forum.nocobase.com/t/possible-ime-bug-vietnamese-typing-issue-with-unikey-in-nocobase-v2-0-8-form-inputs-worked-correctly-in-v1/12578
- https://claudeissues.com/issue/33891-bug-vietnamese-ime-input-doubles-characters-on-windows-x08-bs-not-handled-only-x
- https://unikey.org/en
