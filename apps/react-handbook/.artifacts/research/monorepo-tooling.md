---
topic: monorepo-tooling
researched_at: 2026-10-20
version: "turbo 2.11.9, nx 23.3.0, pnpm 12.14.0, @changesets/cli 3.0.3, lerna 10.1.1, @microsoft/rush 5.181.0, yarn (berry) 4.18.1, npm 12.2.0, typescript 7.0.2"
sources_hash: "mrt-2610a7"
ttl_days: 90
keywords: [monorepo, workspaces, turborepo, nx, pnpm, changesets, task-graph, remote-cache]
---
# Monorepo tooling
> Researched: 2026-10-20

## Summary

A JS/TS monorepo has three layers, and each one usually gets its own tool:
1. **The package manager** (pnpm, npm, or Yarn workspaces) installs dependencies and links local packages.
2. **The task runner** (Turborepo, Nx, Rush) orders tasks by the dependency graph, caches their results locally and remotely, and runs only what a change affects.
3. **Release tooling** (Changesets, `nx release`, Lerna) bumps versions, writes changelogs, and publishes.

Turborepo and Nx both hash a task's inputs into a key, and a cache hit replays the stored logs and restores the declared `outputs`. pnpm's isolated `node_modules` blocks phantom dependencies, and its `catalog:` protocol gives a repo one version per dependency. Changesets **3.0** (Aug 2026) changed peer-dependency handling: a bumped peer now gives its dependents a **patch** where 2.x forced a **major**. Lerna is now Nx-branded and works on top of Nx; its old `bootstrap`/`add`/`link` commands were removed outright in v9. Turborepo has an **experimental** `turbo boundaries` command, and Nx's lint rule (`@nx/enforce-module-boundaries`) is still the mature option.

Versions above come from the npm registry `latest` tags on 2026-10-20 (turbo 2.11.9 was published 2026-10-16).

## Key Information

### 1. Capability matrix

| Capability | pnpm ws | npm ws | Yarn Berry ws | Turborepo | Nx | Lerna | Rush | Bazel |
|---|---|---|---|---|---|---|---|---|
| Workspaces / linking (`workspace:`) | **yes**: full `workspace:*/~/^` protocol, rewritten on publish | **partial**: symlinks workspaces into `node_modules`, no `workspace:` protocol (unverified, see Uncertainties) | **yes**: `workspace:` protocol, rewritten on publish | **no**: uses the package manager's workspaces | **partial**: uses package-manager workspaces or TS path aliases | **no**: linking commands removed; uses the package manager | **yes**: Rush installs and links projects itself | **n/a**: its own BUILD graph (rules_js) |
| Task graph / topo order | **partial**: `pnpm -r` runs in topological order; no task-level deps | **no**: `--workspaces` runs in `package.json` order | **partial**: `workspaces foreach -t` respects topological order | **yes**: `dependsOn: ["^build"]` (deps first), `"lint"` (same package), `"pkg#task"` | **yes**: `dependsOn` (`^build`) per target or via `targetDefaults` in `nx.json` | **yes**: `lerna run` (powered by Nx) | **yes**: dependency-ordered and phased builds | **yes**: action graph |
| Local cache | no | no | no | **yes**: `.turbo`; logs plus `outputs` | **yes**: logs plus `outputs` | **yes**: through Nx | **yes**: build cache | **yes**: content-addressed |
| Remote / shared cache | no | no | no | **yes**: Vercel Remote Cache by default (`turbo login` / `turbo link`); self-host with the open Remote Caching API | **yes**: Nx Cloud (managed); self-host by implementing the OpenAPI spec (`NX_SELF_HOSTED_REMOTE_CACHE_SERVER`); bucket plugins such as `@nx/s3-cache` carry a "Commercial" license | **yes**: through Nx Cloud | **yes**: cloud build cache providers (unverified details) | **yes**: Remote Execution / Remote Cache APIs |
| Affected detection | **partial**: `--filter "...[origin/main]"` | no | **partial**: `foreach --since` (unverified) | **yes**: `--affected` (= `--filter=...[main...HEAD]`; `TURBO_SCM_BASE` / `TURBO_SCM_HEAD`) | **yes**: `nx affected -t <task>`; `--base/--head` or `NX_BASE` / `NX_HEAD` | **yes**: `--since` (unverified) | **yes**: `--to`/`--from`/git selectors (unverified) | **partial**: by query (`rdeps`) |
| Module boundaries | no | no | **partial**: `yarn constraints` (manifest rules only) | **partial / experimental**: `turbo boundaries` (undeclared imports, files outside the package, tag allow/deny) | **yes**: `@nx/enforce-module-boundaries` (ESLint; Oxlint experimental) with tags and `depConstraints`; Conformance rule needs the Enterprise plan | no | **partial**: allowed-dependency policies (unverified) | **yes**: `visibility` |
| Code generation | no | `npm init -w` scaffolds | no | **yes**: `turbo gen workspace` (`--copy`) plus custom generators on Plop | **yes**: generators (`nx g`) from plugins or local ones | no | no | no |
| Version / release | no (publish only: `pnpm -r publish`) | no | **partial**: `yarn version` plus deferred versioning (unverified) | **no**: points to Changesets | **yes**: `nx release` (version, changelog, publish; conventional commits or version plans; release groups) | **yes**: `lerna version` / `lerna publish` | **yes**: `rush change` / `rush publish`, lockstep or individual version policies | n/a |

**Lerna status:** the site footer says "© 2026 Copyright Nx", and task running is "Powered by Nx". "The latest version of Lerna is kept up to date with the latest major version of Nx." `lerna bootstrap/add/link` were removed by default in v7.0.0 (June 2023) and fully removed in v9.0.0 (Sept 2025). Use package-manager workspaces in their place.

**Bazel** (briefly): a polyglot hermetic build system with a remote cache and remote execution. JS support comes from rules_js. It is heavy for a JS-only repo.

### 2. Cache keys

**Turborepo** ("Turborepo assumes that your tasks are deterministic"):
- *Global hash:* the resolved `turbo.json` task definitions, lockfile changes that affect the root, sources of internal packages the root depends on, `globalDependencies` file contents, `globalEnv` values, runtime-affecting flags (for example `--env-mode`), and passthrough args. A change to any of these invalidates every task.
- *Package/task hash:* the package's `turbo.json`, lockfile changes that affect the package, its `package.json`, and file contents (default: all source-controlled files in the package, narrowed by `inputs`; `$TURBO_DEFAULT$` restores the default set). Values in `env` count toward the hash. `passThroughEnv` values do not.
- `envMode` defaults to `"strict"`: only `env`/`globalEnv` vars (plus PATH, HOME and similar) reach the task.
- *On a hit:* files in `outputs` are restored and terminal output is replayed (`--output-logs` controls verbosity). An empty or omitted `outputs` caches logs only.
- Debugging: `--dry` and `--summarize`. Diff two summaries to see why the hashes differ.

**Nx:** the hash can include the project's and its dependencies' source files, relevant workspace config, external dependency versions, runtime values (OS, CPU arch), and CLI args. The cache entry stores stdout/stderr, the files matched by `outputs`, and the hash, but not the inputs. "On a cache hit, Nx restores the cached output files and prints the stored terminal output."

### 3. pnpm specifics
- **Strict layout:** "pnpm uses symlinks to add only the direct dependencies of the project into the root of the modules directory". Everything else lives in `node_modules/.pnpm` (a virtual store backed by the content-addressable store), so app code cannot `require` a dependency it never declared (a *phantom dependency*). npm and Yarn Classic hoist everything flat, which makes those imports work by accident.
- **Hoisting settings** (`pnpm-workspace.yaml` only, since `.npmrc` is now just for auth/registry):
  - `hoist: true` (default). Packages are hoisted into the hidden `node_modules/.pnpm/node_modules`, where only dependencies can see them.
  - `hoistPattern: ['*']` (default)
  - `publicHoistPattern: []` (default). Hoists into the root `node_modules`, for broken plugin tooling.
  - `shamefullyHoist: false` (default; `true` is the same as `publicHoistPattern: ['*']`)
  - `nodeLinker: isolated` (default; symlinked). Other values: `hoisted` (flat, npm-style), `pnp` (Yarn PnP), and `loaded` (experimental).
- **`workspace:` on publish:** `workspace:*` becomes `1.5.0`, `workspace:~` becomes `~1.5.0`, `workspace:^` becomes `^1.5.0`, and `workspace:^1.5.0` becomes `^1.5.0`. A bare `workspace:` is treated as `workspace:*`. `linkWorkspacePackages` defaults to `false`, so only `workspace:` deps get linked. `injectWorkspacePackages` makes pnpm hard-link workspace packages instead of symlinking them. (For comparison, Yarn Berry rewrites `workspace:*` to the exact `=3.2.1`.)
- **Catalogs:** define a `catalog:` (the default) and/or named `catalogs:` in `pnpm-workspace.yaml`, then write `"react": "catalog:"` or `"catalog:react19"` in `package.json`. They work in deps, devDeps, peerDeps, optionalDeps and `overrides`. `pnpm publish/pack` swap in the real range. `catalogMode` takes `manual` (default), `strict` (only catalog versions allowed), or `prefer`.

### 4. Changesets
- A changeset is a `.changeset/<id>.md` file. Its YAML frontmatter maps package names to `major|minor|patch`, and the markdown body becomes the changelog entry. Create one with `pnpm changeset`. `changeset version` consumes the files and bumps versions and changelogs. `changeset publish` publishes.
- **`fixed`:** groups of packages that are "version-bumped and published together". Every member gets the same bump, even with no changes of its own.
- **`linked`:** members share a version line (bumps start from the highest version in the group), but unchanged members are **not** bumped or published. To publish everything together, use `fixed`.
- **`updateInternalDependencies`** (default `"patch"`): `"patch"` updates a dependent's range on every patch release, while `"minor"` updates it only on minor changes. A range that the new version would leave is **always** updated. Per the config docs, the range only changes when the dependent package is itself being released.
- **Dependents get patch bumps:** from the decisions doc, "All updating of dependencies is done as a patch bump." The experimental `updateInternalDependents` (`"out-of-range"` default, or `"always"`) controls when unreleased dependents are pulled in with a patch. Write your own changeset if a dependent needs a bigger bump.
- **Peer dependencies (checked in source):**
  - **2.x:** a `minor` or `major` release of a peer dependency forced a **major** bump of the package declaring it (`shouldBumpMajor`; a patch did not). With `onlyUpdatePeerDependentsWhenOutOfRange: true`, the major applied only when the new version left the peer range.
  - **3.0.0** (2026-08-11, PR #2090): "Peer dependencies now bump packages that depend on them by `patch` instead of `major`." If the dependent is incompatible, add a manual `major` changeset. The legacy `docs/decisions.md` still describes the old major rule and is outdated.

### 5. TypeScript project references and internal packages
- `references: [{ "path": "../pkg" }]` in tsconfig. Referenced projects need `composite: true`, which forces `declaration`, sets `rootDir` to the tsconfig's directory by default, and requires every file to be matched by `include`/`files`. Add `declarationMap` so go-to-definition works across packages. Imports from a referenced project resolve to its output `.d.ts`.
- `tsc -b` finds the referenced projects, checks which are up to date (via `.tsbuildinfo`), and builds the stale ones in dependency order. It behaves as if `noEmitOnError` were set. Flags: `--verbose`, `--clean`, `--force`, `--dry`, `--watch`.
- TS 7.0 (native Go compiler, now npm `latest` at 7.0.2) supports `--build` and adds `--builders` to build references in parallel. The stable programmatic API is not there yet (see Uncertainties).
- **Turborepo internal-package strategies:**
  - *Just-in-Time:* `exports` points straight at `.ts` source (`"./button": "./src/button.tsx"`), and the consumer's bundler compiles it. There is no build step, so nothing to cache. `compilerOptions.paths` can't be used (use Node subpath imports instead). Type errors surface in the consumers.
  - *Compiled:* the package builds itself with `tsc` into `dist`, and those outputs are cacheable. `exports` uses conditions: `types` points at source or `.d.ts`, `default` at `./dist/*.js`.
  - *Publishable:* compiled and also published to npm. This is the strictest option, and the docs recommend Changesets for it.
- `exports` is the package's public API: anything not listed there can't be deep-imported.

### 6. CODEOWNERS (GitHub)
- Location: `.github/CODEOWNERS`, the repo root, or `docs/`. The first one found wins. GitHub reads the file from the PR's **base** branch.
- Each line is `pattern @user @org/team email`. All owners for a pattern go on one line, and owners need write access. Lines with invalid syntax are skipped.
- **The last matching pattern takes precedence.** Put general rules first and specific ones later.
- These gitignore features are unsupported: `!` negation, `[ ]` ranges, and escaping a leading `#`. The file must be under 3 MB.
- Turn on "Require review from Code Owners" in branch protection or rulesets. Approval from any one owner satisfies it.

## Implementation Notes
- Minimal Turborepo pipeline: `"build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] }`, `"lint": {}`, `"test": { "dependsOn": ["^build"] }`. Every env var a build reads must be listed in `env`, or strict mode hides it and the cache can go stale.
- In CI, `--affected` needs the git history between base and head. Turborepo suggests `--filter=blob:none --depth=0` checkouts. A shallow clone makes every package count as changed.
- With Nx, set `NX_BASE` to the last successful `main` commit (not just `main~1`).
- A pnpm workspace should declare internal deps as `"@repo/ui": "workspace:*"` and shared third-party versions through `catalog:`.

## Gotchas
- turborepo.com now 301-redirects to **turborepo.dev**, so update old links.
- Setting `inputs` without `$TURBO_DEFAULT$` *replaces* the default file set, and the hash can then miss real changes.
- JIT packages give Turborepo nothing to cache, so the consuming app pays the compile cost on every run.
- pnpm 10+ ignores hoisting and linker settings in `.npmrc`. They must go in `pnpm-workspace.yaml`.
- Changesets 2 to 3 changes peer-dependency semantics. A repo that relied on the automatic major bumps now needs explicit majors.
- Nx's old "custom tasks runners" API is deprecated. Self-hosted caching now means the OpenAPI server or Nx Cloud.
- CODEOWNERS has no `!` negation. To "un-own" a path, add a later line for it with no owners or with different owners.

## Recommendations
- Small/medium TS monorepo: **pnpm workspaces + catalogs + Turborepo + Changesets**. Pick **Nx** when you need enforced module boundaries, generators, or `nx release` from one vendor.
- Prefer **Compiled** internal packages for shared libraries (they cache, and the `exports` + `types` contract stays clean). Use **JIT** for app-only UI packages consumed by Next.js/Vite.
- Treat `exports` as the boundary. Until `turbo boundaries` leaves experimental status, back it up with lint rules.
- Pin tool versions with `packageManager` in the root `package.json` and corepack.

## Uncertainties
- npm workspaces and the `workspace:` protocol: the npm docs only describe symlinking and `-w`/`--workspaces` (which runs in `package.json` order). Not supporting the protocol is long-standing npm behavior that I did not re-check on npm 12.
- Rush cache providers, Lerna `--since`, Yarn `foreach --since`/`yarn version` details, and Rush boundary policies come from memory, not from pages fetched today.
- Turborepo docs don't explicitly list "hashes of dependency tasks" as a task-hash input. Upstream internal-package sources are covered for the root; per-task dependency hashing is assumed, not verified.
- Licensing of `@nx/s3-cache` (v5.0.7, npm license field "Commercial"): a third-party page and older Nx docs say it is "free with an activation key", but the current Nx self-hosting page no longer mentions bucket plugins at all.
- The Lerna/Nx version matrix table was ambiguous (its top row read `>=21.5.2 <22`), while npm shows lerna 10.1.1 and nx 23.3.0.
- TS 7.0 GA date and how complete its `--build`/watch support is: secondary sources only.
- Turborepo 3.0 has not shipped as far as I found. 2.9 announced deprecations that prepare for it.
- I could not open the CACM paper URL (403 to bots). The Google Research page resolves.

## Sources
- Turborepo caching: https://turborepo.dev/docs/crafting-your-repository/caching
- Turborepo config (`dependsOn`, `inputs`, env): https://turborepo.dev/docs/reference/configuration
- Turborepo run (`--affected`, `--filter`): https://turborepo.dev/docs/reference/run
- Turborepo boundaries (experimental): https://turborepo.dev/docs/reference/boundaries
- Turborepo internal packages: https://turborepo.dev/docs/core-concepts/internal-packages
- Turborepo generators: https://turborepo.dev/docs/guides/generating-code
- Turborepo remote caching: https://turborepo.dev/docs/core-concepts/remote-caching
- Nx caching: https://nx.dev/docs/concepts/how-caching-works
- Nx self-hosted cache: https://nx.dev/docs/guides/tasks--caching/self-hosted-caching
- Nx module boundaries: https://nx.dev/docs/features/enforce-module-boundaries
- Nx affected: https://nx.dev/docs/features/ci-features/affected
- Nx release: https://nx.dev/docs/features/manage-releases
- Nx generators: https://nx.dev/docs/features/generate-code
- Lerna + Nx: https://lerna.js.org/docs/lerna-and-nx-version-matrix and https://lerna.js.org/docs/legacy-package-management
- pnpm: https://pnpm.io/workspaces, https://pnpm.io/catalogs, https://pnpm.io/settings/node-modules, https://pnpm.io/motivation
- Yarn: https://yarnpkg.com/features/workspaces, https://yarnpkg.com/protocol/workspace
- npm workspaces: https://docs.npmjs.com/cli/using-npm/workspaces
- Changesets: https://changesets.dev/guide/config, https://github.com/changesets/changesets (docs/decisions.md; packages/assemble-release-plan/src/determine-dependents.ts at tags @changesets/cli@2.29.0 and @3.0.3; CHANGELOG 3.0.0)
- TS project references: https://www.typescriptlang.org/docs/handbook/project-references.html
- Rush: https://rushjs.io/ · Bazel: https://bazel.build/
- GitHub CODEOWNERS: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- Read more: https://monorepo.tools/ · Potvin & Levenberg, "Why Google Stores Billions of Lines of Code in a Single Repository", CACM 59(7), 2016: https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/ (CACM copy: https://cacm.acm.org/research/why-google-stores-billions-of-lines-of-code-in-a-single-repository/, which returned 403 to the fetcher)
- Versions: https://registry.npmjs.org/{turbo,nx,pnpm,lerna,@changesets/cli,@microsoft/rush,typescript}
