---
id: 004
feature: monorepo-migration
created: 2026-10-26
---

# Decisions: Monorepo Migration

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### Monorepo tooling

- **Question:** Which workspace manager and task runner?
- **Decision:** pnpm workspaces + Turborepo.
- **Rationale:** User request. pnpm already landed on `main` (quick task 002, `cba68f9`) and passed every gate on the single-app layout, so this feature only adds the workspace split and the task runner.
- **Caveats:** None.

### What the monorepo holds at first

- **Question:** Is there a second app or shared library to build now?
- **Decision:** No. The existing site becomes the only app; a second app will be created later and is not part of this feature.
- **Rationale:** User: "second app will create later". Extracting UI, i18n or content into packages before a second consumer exists adds import churn (the locale provider alone has 19 importers) with no payoff.
- **Caveats:** Shared *config* (TypeScript base, lint rules) is the only thing worth sharing up front, because the next app needs it on day one.

### Deploy paths to keep working

- **Question:** How is the site deployed today?
- **Decision:** Both: Cloudflare Workers Builds from GitHub and local deploys from the developer machine. Both must work after the move.
- **Rationale:** User: "Both".
- **Caveats:** The Workers Builds root directory / build command live in the Cloudflare dashboard, outside the repo, and must be changed by the user at merge time.

### Local deploy command name

- **Question:** `pnpm deploy` is a pnpm built-in (it copies a workspace package elsewhere), so it never reaches the `deploy` script. Rename or document?
- **Decision:** Tentatively expose the Cloudflare deploy under a name that cannot collide with a pnpm built-in (exact name chosen in design); keep `pnpm run deploy` working.
- **Rationale:** A command that silently does something else is worse than a renamed one.
- **Caveats:** Confirm the name in design.

### Branching

- **Question:** Feature branch or `main`?
- **Decision:** Commit directly to `main`.
- **Rationale:** User preference (pnpm switch went straight to `main`, feature branch deleted).
- **Caveats:** This is a breaking layout change, so each task must leave `main` green (build, tests, preview) before it is pushed.

## Tentative

### Remote build cache

- **Question:** Enable a shared remote cache for the task runner?
- **Tentative Decision:** No; local cache only.
- **Revisit when:** CI or a second app makes build times matter.
