---
id: "011"
feature: multi-step-form
created: 2026-10-07
---

# Technical Design: Multi-Step Form

## Scope

In scope: a hand-built wizard engine (form store, per-step validation timing, conditional steps derived from values, step ↔ address sync, focus management), a job application with seven possible steps plus review and confirmation, a versioned local draft with migration, an async email check, a submission API that re-validates with the same shared rules, a live form inspector, demo controls and the explanation guide.

Out of scope (from the spec): file attachments, accounts, server-side drafts, editing after submission, i18n, form libraries.

## Research Summary

> No new technology. Next.js 16 bundled docs were read for the address handling.

- `window.history.pushState` / `replaceState` integrate with the Next router and keep `useSearchParams` in sync (`node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md:343-347`). No `router.push` (which would re-render the route segment and could scroll).
- On a prerendered route, `useSearchParams` client-renders the tree up to the nearest `<Suspense>`; wrap the wizard in one (`.../03-api-reference/04-functions/use-search-params.md:80-88`). In dev it doesn't suspend, so this only shows up in `pnpm build`.
- Zod 4 (`package.json:23`, `^4.6.5`): `safeParse` issues carry `path` arrays, which map directly to field ids; `z.treeifyError` is what `parseBody` returns today.
- ui-ux-pro-max (forms, feedback, navigation): visible labels, validate on blur, error under the field *and* an error summary for long forms, progress "Step X of N", loading → success/error feedback on submit, predictable Back, deep links. Its shadcn guidance recommends `Form` + react-hook-form; that conflicts with the practice rule (hand-built engine) and is deliberately not followed.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Practice route | `page.tsx` renders `PracticeFrame` with `practiceMetadata(slug)` | Client code in the page file | `src/app/(playground)/practices/context-reducer/page.tsx:1-16` |
| Shared rules | `src/server/practices/{slug}/*.schema.ts` without `server-only`, imported by UI and routes | Duplicating rules on the client | `src/server/practices/context-reducer/shop.schema.ts:73-98` |
| Server logic | `*.store.ts` with `import "server-only"`; process state on `globalThis` (HMR-safe) | Module-level counters | `src/server/practices/context-reducer/shop.store.ts:1,32-34` |
| Route handlers | Thin: parse query with Zod, parse body, delay, call store, respond | Logic in the route | `src/app/api/practices/context-reducer/checkout/route.ts:7-20` |
| Error shape | `{ error: { message, issues? } }`, 400 bad JSON, 422 validation | Ad-hoc shapes | `src/lib/http.ts:3-11`, `.claude/rules/04-architecture.md` |
| Client API module | Network settings object read at request time; typed errors | Passing settings through props | `src/practices/context-reducer/shop-api.ts:12-17,37-52` |
| Event handlers | Named `handleX` unless a one-line call | Multi-line inline handlers | `.claude/rules/05-event-handlers.md` |
| Theme tokens | `text-destructive`, `bg-muted`, `--warning`; light-mode darkened destructive text for contrast | Raw colors | `src/practices/accessible-modal/modal.tsx:24` |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `PracticeFrame` | `src/components/playground/practice-frame.tsx:8` | Page frame (title, guide, controls, demo) |
| `DemoControls`, `DemoStage` | `src/components/playground/demo-controls.tsx:5`, `demo-stage.tsx:31` | Controls panel and error-bounded stage |
| Guide blocks | `src/components/playground/practice-guide.tsx:8-77` (`Intro`, `KeyIdeas`, `ReadMore`, `GuideSection`, `DoAvoid`, `ControlGuide`) | Explanation in the playground guide format |
| `confirm()` | `src/practices/accessible-modal/modal-store.ts:66` (options `:18-27`) | "Start over" confirmation (destructive) |
| `toast` | `src/practices/toast-notifications/toast-store.ts:317-325` | Storage-blocked warning, submit failure, "Draft restored" alternative not used (inline notice instead) |
| `jsonError` | `src/lib/http.ts:5` | Error responses from the new routes |
| `getPractice`, `practiceMetadata` | `src/practices/catalog.ts:121,125` | Page metadata |
| Catalog entry | `src/practices/catalog.ts:77-83` (`built: false`) | Flip to `built: true` |
| `Button`, `Input`, `Textarea`, `Card`, `Separator`, `Skeleton` | `src/components/ui/*` | Primitives |
| shadcn `label`, `checkbox`, `radio-group`, `progress` (to add with the CLI) | not present (`src/components/ui/` has button, card, input, separator, sheet, sidebar, skeleton, textarea, tooltip) | Basic primitives; no shadcn `form`/`field` (state/validation is the practice) |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| ApplicationValues | Everything the applicant typed, grouped by step (including steps that currently don't apply) |
| StepDef | Static definition of a step: id, address slug, title, field order, rules, whether it applies |
| FormMeta | Visited fields, steps where Next/Submit was attempted, server errors, email-check state |
| Draft | What's saved locally (versioned) |
| ApplicationBody | What's sent to the server (only applicable steps) |
| SubmissionResult | Accepted (number, time) or rejected (field issues) |

All entities are new; no existing type is read or modified except `ApiError` (`src/lib/http.ts:3`: `error.message: string`, `error.issues?: unknown`) and `ConfirmOptions` (`modal-store.ts:18-27`: `title`, `description`, `confirmLabel`, `cancelLabel`, `destructive`, `returnFocus`).

#### ApplicationValues (new, `application.schema.ts`)

- `personal`: `fullName` (string, 2–80, trimmed), `email` (string, valid email, ≤ 254), `phone` (string, optional; `+`, digits, spaces, `()-`, 7–20), `country` (one of ~12 listed countries)
- `role`: `role` (`engineering` | `design` | `sales`), `employment` (`full-time` | `part-time` | `contract`), `startMonth` (`YYYY-MM`, not before this month, ≤ 6 months ahead), `needsSponsorship` (`yes` | `no`)
- `experience`: `none` (boolean), `entries` (1–5 unless `none`): `id` (string, stable key), `company` (1–80), `title` (1–80), `startMonth` (`YYYY-MM`, not in the future), `endMonth` (`YYYY-MM` ≥ start and not in the future, required unless `current`), `current` (boolean)
- `engineering`: `languages` (1–5 of a fixed list), `years` (integer 0–50), `profileUrl` (optional `https://` URL)
- `design`: `portfolioUrl` (required `https://` URL), `tools` (1+ of a fixed list)
- `authorization`: `residence` (listed country), `status` (`citizen-elsewhere` | `student-visa` | `work-visa` | `other`), `earliestMonth` (`YYYY-MM`, not before this month, ≤ 12 months ahead; cross-step: must not be after `role.startMonth`)
- `extras`: `coverLetter` (100–2000 chars), `salaryMin`, `salaryMax` (integers 10 000–1 000 000, min ≤ max), `source` (optional, listed)
- `review`: `consent` (must be `true`)

Form inputs hold strings (numbers parsed by the schema with `z.coerce`), so a half-typed value never breaks the store.

#### StepDef (new, `steps.ts`)

- `id`: `personal` | `role` | `experience` | `engineering` | `design` | `authorization` | `extras` | `review`
- `slug` (address value, same as id), `title`, `fields` (ordered field paths, for focus and the error summary), `applies(values)` (engineering: `role === "engineering"`; design: `role === "design"`; authorization: `needsSponsorship === "yes"`; others: always)
- Step order: personal → role → experience → engineering | design → authorization → extras → review

#### FormMeta (new, `form-store.ts`)

- `visited: Set<string>` (field paths left at least once), `attempted: Set<StepId>` (Next/Submit pressed on the step), `serverErrors: Map<string, string>` (path → message, cleared when that field changes), `furthest: StepId` (furthest step reached), `email: { value, status: "idle" | "checking" | "available" | "taken" | "error", message? }`, `submit: { status: "idle" | "submitting" | "failed", message? }`

#### Draft (new, `draft.ts`)

- v2 (current): `version: 2`, `savedAt` (ISO string), `step` (StepId), `furthest` (StepId), `values` (only applicable steps; each field loosely typed — strings/booleans/arrays — so values that break the rules survive and show their error)
- v1 (older, demo sample): `version: 1`, `data` flat: `name`, `email`, `role`, `jobs: [{ company, position, from, to }]` → migrated to v2 (`name` → `personal.fullName`, `jobs[].position` → `title`, `to: "present"` → `current: true`)

#### ApplicationBody / SubmissionResult (new, `application.schema.ts`)

- Body: `personal`, `role`, `experience`, `extras`, `review` (required), `engineering` / `design` / `authorization` (present only when they apply)
- Accepted: `applicationId` (`APP-1001`…), `submittedAt` (ISO), `summary` (`fullName`, `role`, `email`)
- Rejected: `FieldIssue[]`: `step` (StepId), `path` (e.g. `experience.entries.0.endMonth`), `message`

### Relationships

ApplicationValues 1—1 FormMeta (same store). StepDef.applies(ApplicationValues) → applicable steps (derived, never stored). Draft = applicable slice of ApplicationValues + `step` + `furthest`. ApplicationBody = applicable slice of ApplicationValues with values coerced. FieldIssue.path is a path into ApplicationValues; its first segment is the StepId.

### API Contracts

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/practices/multi-step-form/email-check` | POST | `?latencyMs=`, body `{ email }` | 200 `{ data: { available: boolean, message?: string } }` · 400 bad JSON · 422 invalid email |
| `/api/practices/multi-step-form/applications` | POST | `?latencyMs=&outcome=accept\|reject-field\|email-taken\|server-error`, body ApplicationBody (JSON) | 201 `{ data: { applicationId, submittedAt, summary } }` · 400 bad JSON · 422 `{ error: { message, issues: { fields: FieldIssue[] } } }` · 500 `{ error: { message } }` |

The applications route doesn't use `parseBody` for 422: it needs step/field issues rather than `treeifyError`. It reads JSON itself (400 on failure) and calls the store, which runs the shared `validateApplication` and server-only rules.

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Currently Exposed? | Gap? |
|-------|-------|--------------------|--------------------|------|
| AC-010 | Application number | none (new: store → `applicationId`) | no | must add |
| AC-010 | Summary (name, role, email) | none (new: `summary`) | no | must add |
| AC-016 | Save time | none (new: `Draft.savedAt`) | no | must add |
| AC-030 | Values | none (new: store) | no | must add |
| AC-030 | Visited fields | none (new: `FormMeta.visited`) | no | must add |
| AC-030 | Errors (browser + server) | none (new: derived + `serverErrors`) | no | must add |
| AC-030 | Applicable steps | none (new: derived from `StepDef.applies`) | no | must add |
| AC-030 | Furthest step | none (new: `FormMeta.furthest`) | no | must add |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Hand-built external form store (`useSyncExternalStore`) with per-field subscriptions (`useField(path)` selects value, error, visited) | A keystroke re-renders only that field and the inspector, not all steps; it's the pattern a form library hides, which is the point of the practice |
| One Zod schema per step in a shared `application.schema.ts`, plus `validateApplication(values, today)` for cross-step rules and applicability | Same rules in browser and server (AC-027); `today` is a parameter so rules are deterministic and testable |
| Errors are derived, not stored: `errorsFor(step) = schema issues`, shown when the field is visited, or the step was attempted, or a server error exists | No stale error state to keep in sync; visibility rules match AC-003 |
| Applicable steps derived from values on every render (`steps.filter(s => s.applies(values))`) | Conditional steps can never disagree with the answers (AC-014); nothing to clean up |
| Answers of non-applicable steps stay in the store; draft, review, validation and the body take only applicable steps | Implements decisions.md "kept for the visit, never saved/submitted" |
| Step in the address as `?step={slug}`; Next/Back/Edit/progress use `history.pushState`, corrections use `replaceState`; `useSearchParams` is the source of the current step | Native Back/Forward/refresh work (AC-021–024) and the practice keeps one route; Next docs confirm the history API stays in sync with `useSearchParams` |
| Reachable steps: every applicable step up to and including the first one that's invalid, but not beyond `furthest`; Review is reachable only when every applicable step is valid | One rule for the progress indicator, deep links and draft restore (AC-006, AC-017, AC-023) |
| `furthest` only moves forward through Next or sample fill; it is clamped back when steps stop applying | Matches "steps after the first incomplete one are not selectable" even after role changes |
| Focus: after a step change (any source, including popstate), focus the step's `h2` (`tabIndex={-1}`) and announce "Step X of N: title" in a polite live region; after a failed Next, focus the error summary | AC-002, AC-004, AC-022; one effect keyed on the step |
| Error summary: `role="alert"` region with a heading ("There are N problems on this step") and buttons that focus each field | GOV.UK-style pattern; links work with the hand-built ids |
| Field wrapper components (`TextField`, `TextareaField`, `SelectField`, `RadioGroupField`, `CheckboxField`, `CheckboxGroupField`, `MonthField`) wire `id`, `aria-describedby` (hint + error), `aria-invalid`, `aria-required`, and blur → visited | Ties every error to its field (AC-035) in one place |
| Month input = month + year selects inside a `fieldset` with `legend` | `type="month"` isn't supported everywhere (Firefox desktop falls back to text); selects are keyboard and screen-reader friendly |
| Experience reorder via "Move up/down" buttons (no drag) | Keyboard operable by default (AC-034); drag is not the lesson |
| Email check: 500 ms debounce after a change (or immediately on blur), `AbortController` per request, a request counter to ignore stale answers, results cached per email for the visit | AC-025/026; stale-answer protection taught explicitly |
| Next on Personal awaits a pending check (button shows "Checking email…"); a network error retries once, then blocks with "Couldn't check the email, try again" | AC-026: never skip the server rule |
| Draft: save debounced 400 ms after a change (≤ 1 s, AC-016), key `rp.multi-step-form.draft`, write wrapped in try/catch; on failure warn once (toast) and register `beforeunload` while unsaved | AC-016, AC-020 |
| Draft restore runs once on mount before the first wizard render (client-only, the wizard shows a skeleton until then); the restored step is the address step if reachable, else the draft's step if reachable, else the furthest reachable step | AC-017, AC-024; avoids a flash of empty step 1 |
| Draft parsing: a loose Zod schema (types only) plus v1 → v2 migration; unreadable or wrong-shaped drafts are discarded with a notice | AC-019; edge case "values the rules reject are kept with their error" |
| Submit: client runs `validateApplication`; on success POSTs; 422 issues go into `serverErrors`, the earliest step with an issue opens with `attempted` set; other failures keep everything and show Retry on Review | AC-009, AC-011, AC-028 |
| Confirmation kept in component state; while shown, any step address shows the confirmation until "Start a new application" (which clears the store and pushes `?step=personal`) | Edge case: Back from confirmation doesn't reopen the submitted answers |
| Route handlers (not Server Actions) for the API | Project decision: practice data comes from mock API routes with latency/error injection (knowledge.md, feature 001); tampered-request testing needs a plain HTTP endpoint |
| Server-only rule: used emails (`taken@example.com`, `used@example.com`, plus every accepted application's email) in a `globalThis` set | AC-025/027; survives HMR like practice 9's order counter |
| Inspector subscribes to the whole store and renders collapsible JSON blocks (values, visited, errors, applicable steps, furthest) | AC-030; it's the learner's window, so re-rendering on every change is expected there |
| Demo controls in a client module (`network` object) read at request time; "Fill with sample answers" sets valid values for every step (Engineering + sponsorship) and `furthest = review` | AC-031, mirrors practice 9 |
| Mobile (`< md`): progress collapses to "Step X of N: title" + a progress bar; nav buttons at the end of the step card (not sticky, so they never cover fields) | AC-033 |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| Shared rules | `src/server/practices/multi-step-form/application.schema.ts` | new | Step ids, option lists, per-step schemas, cross-step rules, `validateApplication`, body schema builder, `FieldIssue`, query schemas, sample values |
| Server store | `src/server/practices/multi-step-form/application.store.ts` | new | `server-only`; used emails, application counter on `globalThis`, `checkEmail`, `submitApplication(body, outcome)`, `delay` |
| Email check route | `src/app/api/practices/multi-step-form/email-check/route.ts` | new | POST: parse query, `parseBody` the email, delay, `checkEmail` |
| Applications route | `src/app/api/practices/multi-step-form/applications/route.ts` | new | POST: parse query, read JSON (400), delay, `submitApplication`, 201/422/500 |
| Page | `src/app/(playground)/practices/multi-step-form/page.tsx` | new | `PracticeFrame` with guide and demo |
| Steps | `src/practices/multi-step-form/steps.ts` | new | `StepDef` list, `applicableSteps`, `reachableSteps`, `firstInvalidStep` |
| Paths | `src/practices/multi-step-form/paths.ts` | new | Immutable get/set by path, path ↔ field id |
| Form store | `src/practices/multi-step-form/form-store.ts` | new | Values + FormMeta, actions (`setValue`, `visit`, `attempt`, `setServerErrors`, `reset`, `fillSample`), `useField`, `useFormSnapshot`, `useStepErrors` |
| Step address | `src/practices/multi-step-form/use-step-address.ts` | new | Read `?step`, `goTo(step, { replace })`, correction to the furthest allowed step |
| Draft | `src/practices/multi-step-form/draft.ts` | new | Loose schema, v1 migration, read/write/clear, debounced autosave subscription, samples (v1, corrupted) |
| Email check | `src/practices/multi-step-form/email-check.ts` | new | Debounce, abort, stale guard, cache, `ensureEmailChecked()` for Next |
| Client API | `src/practices/multi-step-form/application-api.ts` | new | `network` settings, `checkEmail`, `postApplication`, `SubmissionRejected` error |
| Field wrappers | `src/practices/multi-step-form/fields.tsx` | new | Accessible inputs bound to `useField` |
| Error summary | `src/practices/multi-step-form/error-summary.tsx` | new | Alert with links that focus fields |
| Progress | `src/practices/multi-step-form/step-progress.tsx` | new | Stepper (md+) and compact bar (< md); complete/current/needs-attention/locked states |
| Wizard | `src/practices/multi-step-form/wizard.tsx` | new | Hydration gate, current step, Next/Back/Submit handlers, focus + live region, confirmation switch |
| Step views | `src/practices/multi-step-form/steps/{personal,role,experience,engineering,design,authorization,extras,review}-step.tsx` | new | Fields per step; experience list editor; review groups with Edit |
| Confirmation | `src/practices/multi-step-form/confirmation.tsx` | new | Application number, summary, "Start a new application" |
| Draft status | `src/practices/multi-step-form/draft-status.tsx` | new | "Saved N min ago", restored notice, Start over |
| Inspector | `src/practices/multi-step-form/form-inspector.tsx` | new | Live JSON of store and derived state |
| Demo | `src/practices/multi-step-form/demo.tsx` | new | Demo controls + stage + `<Suspense>` around the wizard |
| Guide | `src/practices/multi-step-form/explanation.tsx` | new | Playground guide format |
| UI primitives | `src/components/ui/{label,checkbox,radio-group,progress}.tsx` | new (shadcn CLI) | Basic primitives |
| Catalog | `src/practices/catalog.ts` | modify | `built: true` for `multi-step-form` |

### Page layout (ui-ux-pro-max)

- Existing playground frame and tokens; no new palette or fonts.
- Stage: draft status bar (saved time, Start over) → progress (horizontal numbered stepper on md+, compact on phones) → step card (heading, short intro, error summary when shown, fields in one column, max width ~40rem for readable line length) → nav row (Back left, Next/Submit right, "Back to review" when editing from Review) → inspector (collapsible, below).
- States: hydrating (skeleton of progress + card), empty draft (step 1), restored (notice), field checking (inline "Checking…" with spinner, `motion-reduce` static), submitting (button spinner + disabled), failed submit (inline alert on Review with Retry), confirmation (success card).
- Progress step states: complete (check icon), current (`aria-current="step"`), needs attention (warning icon, text "Needs attention"), locked (muted, not a button). Never color alone: icon + text.
- Touch targets ≥ 44 px for nav buttons and stepper items on phones; 16 px base text in inputs to avoid mobile zoom.

## Data Flow

```mermaid
sequenceDiagram
  participant U as Applicant
  participant F as Field
  participant S as Form store
  participant A as Address (?step)
  participant D as Draft (local)
  participant API as Mock API
  U->>F: types
  F->>S: setValue(path)
  S-->>F: value, error (if visited/attempted)
  S-->>D: debounced save (applicable steps)
  F->>API: email check (debounced, latest only)
  U->>S: Next
  S->>S: attempt(step); validate step (+ await email check)
  alt invalid
    S-->>U: errors + summary (focus summary)
  else valid
    S->>A: pushState(?step=next); furthest = max
    A-->>U: render next step, focus heading
  end
  U->>A: browser Back
  A-->>U: render step from address, focus heading
  U->>S: Submit (Review)
  S->>S: validateApplication(all applicable)
  S->>API: POST applications (applicable steps only)
  API-->>S: 201 → confirmation, clear draft
  API-->>S: 422 issues → serverErrors, open earliest step
  API-->>S: 500 → keep all, Retry
```

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | Wizard, Progress | `wizard.tsx`, `step-progress.tsx` | Planned |
| AC-002 | Wizard, Error summary, Form store | `wizard.tsx`, `error-summary.tsx`, `form-store.ts` | Planned |
| AC-003 | Field wrappers, Form store | `fields.tsx`, `form-store.ts` | Planned |
| AC-004 | Wizard, Step address | `wizard.tsx`, `use-step-address.ts` | Planned |
| AC-005 | Wizard | `wizard.tsx` | Planned |
| AC-006 | Progress, Steps | `step-progress.tsx`, `steps.ts` | Planned |
| AC-007 | Experience step, Shared rules | `steps/experience-step.tsx`, `application.schema.ts` | Planned |
| AC-008 | Review step, Wizard | `steps/review-step.tsx`, `wizard.tsx` | Planned |
| AC-009 | Wizard, Shared rules | `wizard.tsx`, `application.schema.ts` | Planned |
| AC-010 | Confirmation, Draft | `confirmation.tsx`, `draft.ts` | Planned |
| AC-011 | Wizard, Client API | `wizard.tsx`, `application-api.ts` | Planned |
| AC-012 | Steps, Engineering/Design steps | `steps.ts`, `steps/engineering-step.tsx`, `steps/design-step.tsx` | Planned |
| AC-013 | Steps, Authorization step | `steps.ts`, `steps/authorization-step.tsx` | Planned |
| AC-014 | Steps, Progress, Review | `steps.ts`, `step-progress.tsx`, `steps/review-step.tsx` | Planned |
| AC-015 | Form store, Draft, Client API | `form-store.ts`, `draft.ts`, `application-api.ts` | Planned |
| AC-016 | Draft, Draft status | `draft.ts`, `draft-status.tsx` | Planned |
| AC-017 | Draft, Wizard, Steps | `draft.ts`, `wizard.tsx`, `steps.ts` | Planned |
| AC-018 | Draft status (confirm) | `draft-status.tsx` | Planned |
| AC-019 | Draft | `draft.ts` | Planned |
| AC-020 | Draft | `draft.ts` | Planned |
| AC-021 | Step address | `use-step-address.ts` | Planned |
| AC-022 | Step address, Wizard | `use-step-address.ts`, `wizard.tsx` | Planned |
| AC-023 | Step address, Steps | `use-step-address.ts`, `steps.ts` | Planned |
| AC-024 | Step address, Draft | `use-step-address.ts`, `draft.ts` | Planned |
| AC-025 | Email check, Email route | `email-check.ts`, `email-check/route.ts` | Planned |
| AC-026 | Email check, Wizard | `email-check.ts`, `wizard.tsx` | Planned |
| AC-027 | Server store, Shared rules | `application.store.ts`, `application.schema.ts` | Planned |
| AC-028 | Wizard, Review step, Client API | `wizard.tsx`, `steps/review-step.tsx`, `application-api.ts` | Planned |
| AC-029 | Applications route, Server store | `applications/route.ts`, `application.store.ts` | Planned |
| AC-030 | Inspector | `form-inspector.tsx` | Planned |
| AC-031 | Demo, Client API, Form store | `demo.tsx`, `application-api.ts`, `form-store.ts` | Planned |
| AC-032 | Guide | `explanation.tsx` | Planned |
| AC-033 | Progress, Wizard layout | `step-progress.tsx`, `wizard.tsx` | Planned |
| AC-034 | Field wrappers, Experience step, Progress | `fields.tsx`, `steps/experience-step.tsx`, `step-progress.tsx` | Planned |
| AC-035 | Field wrappers | `fields.tsx` | Planned |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | None in the repo (no test runner in `package.json`); same approach as features 009/010 |
| Command | `pnpm typecheck && pnpm lint && pnpm build` per task; Node scripts via jiti (`node_modules/.pnpm/jiti@2.7.0`) with the `@` alias for pure modules; Puppeteer MCP for UI |
| Location | Scratch scripts in the session scratchpad; evidence recorded in `audit.md` |

### Reference Tests

| File | What It Tests |
|------|---------------|
| `.artifacts/features/010-context-reducer/audit.md` | Script-based reducer checks, Puppeteer UI checks, axe in both themes |
| `.artifacts/features/009-accessible-modal/audit.md` | Keyboard/focus emulation in Puppeteer |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| Shared rules | scratch `rules.ts` (jiti) | Each step's valid/invalid cases; cross-step start rule; applicability; non-applicable data rejected; issue paths/steps |
| Steps | scratch `steps.ts` (jiti) | Reachable steps for empty, partial, full, role switch; furthest clamping |
| Draft | scratch `draft.ts` (jiti) | v2 round trip, v1 migration, corrupted/junk → discarded, rule-breaking values kept |
| API | scratch `api.mjs` (fetch) | ≥ 20 tampered bodies → 422 with step/field; used email; outcomes; bad JSON 400 |
| UI | Puppeteer evaluate | Keyboard-only run, reload on every step, Back/Forward, deep links, role switching ×10, server errors per field, axe light/dark, 360 px overflow |

## Considerations

### Error Handling

- Network errors on the email check: status `error` with retry; Next retries once before blocking.
- Submission: 422 → field errors; 500/timeout/offline → inline alert with Retry on Review, draft untouched; a 30 s client timeout via `AbortController` counts as a failure.
- Storage: every `localStorage` call wrapped; failure → one toast, `beforeunload` guard while unsaved.
- Corrupted draft → discarded with a notice, never a crash; the stage's error boundary (`DemoStage`) is the last resort.

### Security

- Server never trusts the browser: the full body is re-validated with the shared rules, steps that don't apply are rejected (not ignored), unknown keys are rejected (`strict` objects), sizes are capped (strings, arrays ≤ 5, body read once).
- Drafts are untrusted input: parsed with a schema before use, never `eval`'d or rendered as HTML.
- No personal data in any address: the page address only holds the step slug, and the email check sends the email in a POST body, not a query string.

## Open Questions

- None.
