---
topic: micro-frontends
researched_at: 2026-10-20
version: "webpack 5.112.0, @module-federation/enhanced 2.9.2, @rspack/core 2.2.9, @module-federation/vite 1.23.5, @originjs/vite-plugin-federation 1.4.1, @module-federation/nextjs-mf 8.8.76, @angular-architects/native-federation 22.2.3, @softarc/native-federation 4.8.1, single-spa 6.0.3 (7.0.0-beta.13), systemjs 6.15.1, @podium/layout 5.4.10, next 16.4.2 (repo: 16.3.8), @vercel/microfrontends 2.4.1"
sources_hash: "mfe-2610a1"
ttl_days: 90
keywords: [micro-frontends, module-federation, shared-dependencies, import-maps, multi-zones, single-spa, ssi, esi, podium, shadow-dom, iframes]
---
# Micro-frontend tooling
> Researched: 2026-10-20

## Summary

A micro-frontend setup composes independently deployed frontends into one page or one domain. Composition can happen at build time (npm packages), on the server or edge (SSI, ESI, Podium, fragments), at the routing layer (Next.js Multi-Zones, Vercel Microfrontends), or in the browser (Module Federation, import maps with single-spa or Native Federation, Web Components, iframes).

Module Federation 2.0 (`@module-federation/enhanced`, 2.9.2 on 2026-09-26) is the actively developed line. Rspack builds in a "v1.5" runtime and uses the enhanced package for 2.0. The Next.js plugin `nextjs-mf` is in maintenance mode and does not support the App Router. For Next.js, the framework docs point to Multi-Zones, and Vercel sells a managed "Microfrontends" product built on the same idea.

Versions come from the npm registry `latest` tags on 2026-10-20.

## Key Information

### 1. Module Federation

**Pieces.** Each build is a container. A host consumes remotes. `filename` names the container entry the build emits, "conventionally `remoteEntry.js`" ([webpack plugin docs](https://webpack.js.org/plugins/module-federation-plugin/)). At runtime the host creates a share scope via `__webpack_init_sharing__`, passes it to each remote container's `init()`, then loads exposed modules through the container's `get()` ([webpack concepts](https://github.com/webpack/webpack.js.org/blob/main/src/content/concepts/module-federation.mdx)). Remote modules always load asynchronously, "It's not possible to use a remote module without a chunk loading operation" (same page).

**MF 2.0 additions.** The 2.0 line adds dynamic type hints, a Manifest, the Federation Runtime and a runtime plugin system on top of webpack's built-in version ([MF intro](https://module-federation.io/guide/start/index.html)). It was announced on 2024-04-26 by ByteDance Web Infra with Zack Jackson ([announcement](https://module-federation.io/blog/announcement.html)).

- `mf-manifest.json` describes "which modules the producer exposes, where the remote entry is, which assets those modules need, which shared dependencies are available, and where the type files are". With only `remoteEntry.js`, a consumer can load modules but cannot know assets or shared info ahead of time. A remote can be declared as `name@https://host/mf-manifest.json` ([manifest guide](https://module-federation.io/guide/basic/manifest-snapshot.html), [manifest config](https://module-federation.io/configure/manifest.html)). Enabling `manifest` also emits `mf-stats.json`.
- Runtime API: `createInstance`, `init`, `registerRemotes(remotes, { force })` and `loadRemote('remote/expose')` from `@module-federation/enhanced/runtime`. Remotes can be registered at runtime instead of in the build config, and both styles can be mixed ([runtime API](https://module-federation.io/guide/runtime/runtime-api.html), [runtime access](https://module-federation.io/guide/runtime/index.html)).
- Runtime plugins (`runtimePlugins` in config) hook into stages such as `beforeInit`, `beforeLoadShare`, `errorLoadRemote` and `resolveShare`. Uses listed by the docs: rewrite remote URLs, customize manifest requests, override shared resolution, add fallbacks ([runtimePlugins](https://module-federation.io/configure/runtimeplugins.html), [runtime plugins guide](https://module-federation.io/guide/runtime/runtime-plugins.html)).

**Rspack.** Three options: MF v1.0 (`ModuleFederationPluginV1`, webpack-compatible, "No longer being iterated"), MF v1.5 (built into Rspack, adds runtime plugins), and MF v2.0 via `@module-federation/enhanced/rspack` ([Rspack MF guide](https://rspack.rs/guide/advanced/module-federation.html)).

### 2. `shared` config semantics

Option meanings (webpack docs unless noted):

| Option | Meaning |
|---|---|
| `singleton` | "only allows a single version of the shared module in the shared scope (disabled by default)". Meant for libraries with global state such as React. |
| `requiredVersion` | Semver range the consumer accepts. With array syntax or when omitted, it is inferred from the consumer's `package.json` (a warning if it can't be). MF 2.0 doc default: `require('project/package.json')[devDeps \| dep]['depName']` ([MF shared](https://module-federation.io/configure/shared.html)). `false` accepts any version. |
| `strictVersion` | Reject an invalid version. Defaults to `true` when a local fallback exists and the module is not a singleton, otherwise `false`. No effect without `requiredVersion`. "Throws a runtime error if the required version is not found." |
| `eager` | Puts the provided and fallback module in the initial chunk instead of loading it asynchronously. Those modules are then always downloaded. |
| `shareScope` | Name of the scope (default `'default'`). Builds using different scope names never share, even with matching keys. |
| `version` | Version this build provides, by default read from the dependency's `package.json`. "It allows webpack to replace lower matching versions, but not higher." |
| `import` | The local module provided to the scope, which is also the fallback. `import: false` provides nothing and relies on someone else providing it. |
| `shareKey` | Lookup key in the scope. Both sides must use the same key ([MF shared](https://module-federation.io/configure/shared.html)). |

**How webpack 5 picks a version** (read from `lib/sharing/ConsumeSharedRuntimeModule.js` at [v5.112.0](https://github.com/webpack/webpack/blob/v5.112.0/lib/sharing/ConsumeSharedRuntimeModule.js)):

- Not singleton, `strictVersion: true` (the default when a fallback exists): use the highest version in the scope that satisfies `requiredVersion`. If none does, use the local fallback. With no fallback (`import: false`), throw "No satisfying version (...) of shared module X found in shared scope default".
- Not singleton, `strictVersion: false`: use the highest satisfying version. If none satisfies, `console.warn` and use the highest version in the scope anyway.
- Singleton: pick the highest version in the scope, except that a version that has already been loaded wins over a higher one that hasn't. If it does not satisfy the consumer's range, `console.warn` "Unsatisfied version X from Y of shared singleton module Z (required ^R)" and use it anyway. With `strictVersion: true`, throw instead.
- Key missing from the scope: use the fallback, or fail if there is none.
- Registration ([ShareRuntimeModule.js](https://github.com/webpack/webpack/blob/v5.112.0/lib/sharing/ShareRuntimeModule.js)): if two builds register the same version, the existing entry stays if it is loaded; otherwise an eager provider wins, then the higher `uniqueName`.
- Consuming a shared module from the initial chunk without `eager` fails with "Shared module is not available for eager consumption". The usual fix is an async boundary (`import('./bootstrap')`).

So the answer to "highest or first loaded?" is: highest compatible version, but for singletons an already-loaded copy is never replaced.

**MF 2.0 runtime** (read from [`runtime-core/src/utils/share.ts`](https://github.com/module-federation/core/blob/main/packages/runtime-core/src/utils/share.ts), main branch):

- `shareStrategy: 'version-first'` (default) loads all remote entries at startup so every provider registers, then prefers the highest version. `'loaded-first'` prefers a version already loaded and loads remotes on demand ([shareStrategy](https://module-federation.io/configure/shareStrategy.html)). With `version-first`, an offline remote triggers `errorLoadRemote` with `lifecycle: 'beforeLoadShare'` during startup, and without a handler startup may hang or fail.
- Singleton mismatch: warning by default, thrown error with `strictVersion: true`, same as webpack.
- Not singleton: use the chosen version if it satisfies the range. Otherwise take the first registered version that does. If none does, the resolver returns nothing and the consumer uses its own copy. The docs say the same thing in short form: "If singleton mode is not enabled, and the shared dependencies between the producer and the consumer have different versions, each side will load its own dependencies" ([MF shared](https://module-federation.io/configure/shared.html)).
- Runtime-registered shares without a range default to `requiredVersion: ^<version>`, `strictVersion: false`.

**Subpaths.** `'react-dom'` without a trailing slash only intercepts `import 'react-dom'`. `react-dom/client` is then bundled locally, giving a second React DOM. Share `'react-dom/'` as a prefix to cover subpaths ([MF shared](https://module-federation.io/configure/shared.html)).

### 3. Native Federation and Vite

- Native Federation keeps "the mental model of Module Federation, implemented on browser standards (ES modules and import maps)". Remotes are plain ES modules wired together by an import map. The Angular adapter (`@angular-architects/native-federation` 22.2.3) delegates to Angular's esbuild ApplicationBuilder and supports SSR and incremental hydration. The core (`@softarc/native-federation` 4.8.1) is build-tool agnostic ([README](https://cdn.jsdelivr.net/npm/@angular-architects/native-federation@22.2.3/README.md), [native-federation.com](https://native-federation.com/docs/v4/mental-model/)).
- `@module-federation/vite` (1.23.5, 2026-10-13, repo pushed 2026-10-19) is listed on module-federation.io. All MF options except `dev` are supported ([MF Vite](https://module-federation.io/integrations/build-tool/vite.html)).
- `@originjs/vite-plugin-federation` is not archived, but its last release is 1.4.1 (2025-04-12) and the repo's last push was 2025-05-17 ([GitHub](https://github.com/originjs/vite-plugin-federation), npm). Treat it as inactive.

### 4. Next.js

- `nextjs-mf`: the MF docs page carries "App Router Not Supported" and "Support for Next.js is ending". It supports `next ^15 || ^14 || ^13 || ^12`, Pages Router and SSR, and needs `NEXT_PRIVATE_LOCAL_WEBPACK=true` ([MF Next.js](https://module-federation.io/integrations/framework/nextjs/index.html)). Issue #3153 (2024-11-01, "Next.js Support is in maintenance mode") says there will be no active development from the core team, small Pages Router fixes and community PRs still land, and "Next.js 16 is TBD" ([issue](https://github.com/module-federation/core/issues/3153)). The package still publishes (8.8.76 on 2026-09-26).
- Next.js Multi-Zones (local docs, `node_modules/next/dist/docs/01-app/02-guides/multi-zones.md`, Next 16.3.8; same as [nextjs.org](https://nextjs.org/docs/app/guides/multi-zones)): "Multi-Zones are an approach to micro-frontends that separate a large application on a domain into smaller Next.js applications that each serve a set of paths."
  - A zone is a normal Next.js app with an `assetPrefix` (for example `/blog-static`) so its `/_next/...` assets don't collide. The default zone needs none. The extra asset rewrite is unneeded from Next.js 15.
  - Route paths with `rewrites` in one app or any HTTP proxy. `rewrites` are recommended for latency. `proxy.js` (the Next 16 name for middleware) is for dynamic decisions such as feature flags.
  - Navigation inside a zone is soft; across zones it is a hard navigation. Use `<a>`, not `<Link>`, for cross-zone links. Paths must be unique to one zone.
  - Server Actions need `experimental.serverActions.allowedOrigins` set to the user-facing domain.
- Vercel Microfrontends: managed routing of several Vercel projects under one domain, configured in `microfrontends.json`, generally available, on all plans (Hobby and Pro include two microfrontend projects) ([Vercel docs](https://vercel.com/docs/microfrontends)). The page suggests monorepos, feature flags and faster compilation as alternatives when the goal is developer velocity.

### 5. Import maps, SystemJS, single-spa

- Support (MDN browser-compat-data): `<script type="importmap">` from Chrome/Edge 89, Firefox 108, Safari 16.4, so all current evergreen browsers. Multiple import maps: Chrome 133, Firefox 150, Safari 18.4 ([BCD](https://github.com/mdn/browser-compat-data/blob/main/html/elements/script.json)).
- Merging ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)): browsers keep one global import map and merge each new map into it. Specifiers that were already resolved are dropped from a new map, and a specifier already mapped keeps its first mapping. A map must be present before any module that depends on it loads. Import maps don't apply to `<script src>` or to workers.
- single-spa: `latest` is 6.0.3 (2024-09-29). 7.0 has been in beta since 2025 (`7.0.0-beta.13`, 2025-09-22) ([npm](https://registry.npmjs.org/single-spa), [releases](https://github.com/single-spa/single-spa/releases)). The recommended-setup page (6.x) makes each app and each large shared library an in-browser module via an import map, with everything else a build-time module. Load the framework once per page. "We currently recommend only using import maps, although we have no objection to module federation." SystemJS is "not a true polyfill of import maps" and requires `System.register` output. es-module-shims is native ESM but "not the single-spa core team's recommended approach for production". Local development uses `import-map-overrides` against deployed environments ([single-spa docs](https://single-spa.js.org/docs/recommended-setup/)).

### 6. Server and edge composition

- SSI: nginx `ngx_http_ssi_module` processes `<!--# include virtual="/path" -->` (or `file=`). Several includes run in parallel, and `wait="yes"` makes processing sequential ([nginx](https://nginx.org/en/docs/http/ngx_http_ssi_module.html)).
- ESI: ESI Language Specification 1.0, a W3C Note from 2001-08-04 (Akamai, Oracle and others), not endorsed by W3C. `<esi:include src alt onerror="continue">` fetches a fragment, with `alt` as fallback ([W3C](https://www.w3.org/TR/esi-lang/)).
- Podium (Node.js): a podlet server serves HTML fragments, and a layout server fetches them and stitches the full page, using `@podium/client`, `@podium/context` and `@podium/proxy`. Actively released (`@podium/layout` 5.4.10 on 2026-10-19) ([podlet](https://github.com/podium-lib/podlet), [layout](https://github.com/podium-lib/layout)).
- Tailor (Zalando, "A streaming layout service for front-end microservices"): GitHub repo archived, last push 2022-07-26; npm `node-tailor` last release 3.9.2 in 2018 ([GitHub](https://github.com/zalando/tailor)).
- Edge fragments: Cloudflare's "fragment piercing" post (2022-11-17) renders micro-frontend fragments on Workers and moves their DOM into a legacy client app once it is ready ([Cloudflare blog](https://blog.cloudflare.com/fragment-piercing/)). The follow-up `web-fragments` package is at 0.8.2 (2025-11-06), still pre-1.0.

### 7. Web Components and Shadow DOM

- Page CSS does not match nodes inside a shadow tree, and shadow-tree selectors don't match outside it. "Selectors and their associated style definitions don't bleed between scopes" ([MDN CSS scoping](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scoping), [MDN using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)).
- What does cross: inheritance. CSS uses the flattened tree "for all purposes after Selectors (including inheritance and box construction)" ([CSS Shadow Module](https://drafts.csswg.org/css-shadow-1/)). Inherited properties such as `color` and `font-family` on the host flow in, and so do custom properties, which inherit by default. Slotted elements inherit from their slot.
- `::part(name)` styles elements that carry a `part` attribute, but only from the direct parent tree; `exportparts` forwards parts further out ([MDN ::part](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::part)). `:host` and `::slotted()` style the host and slotted content from inside.
- Declarative Shadow DOM (`<template shadowrootmode>`): Chrome 111, Firefox 123, Safari 16.4 ([BCD template](https://github.com/mdn/browser-compat-data/blob/main/html/elements/template.json)). It lets server-rendered fragments ship with their shadow root.

### 8. iframes

- Isolation is complete (separate document, JS realm, CSS). Cam Jackson lists the costs: routing, history and deep-linking get harder, and so does responsive layout ([martinfowler.com](https://martinfowler.com/articles/micro-frontends.html)).
- Performance: "every `<iframe>` in a page requires increased memory and other computing resources" ([MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)). `loading="lazy"` defers offscreen frames.
- Accessibility: each iframe needs a `title`. Without one, screen-reader users must enter the frame to find out what it is (MDN, same page).
- Sizing: an iframe doesn't grow to fit its content, so height has to be sent from the child via `postMessage` (from memory, not re-checked today).

### 9. Published guidance

- Cam Jackson, "Micro Frontends", martinfowler.com, 2019-06-19: "independently deliverable frontend applications are composed into a greater whole". Covers server-side template composition, build-time packages (strongly discouraged because it creates a "lockstep release process"), and run-time via iframes, JavaScript (the article's default) or Web Components. Keep communication minimal, prefer the URL, and "avoid having any shared state". Shared component libraries hold "only UI logic, and no business or domain logic". It also recommends a BFF per micro frontend and names payload duplication and operational complexity as downsides ([martinfowler.com](https://martinfowler.com/articles/micro-frontends.html)).
- Michael Geers, micro-frontends.org (author of *Micro Frontends in Action*, Manning): teams are cross-functional and each owns a business area end to end. Its rules are to be technology agnostic, isolate team code ("Don't share a runtime"), use team prefixes for CSS, events and storage, favor native browser features, and build a resilient site. Teams communicate through DOM `CustomEvent`s rather than a global pub/sub ([micro-frontends.org](https://micro-frontends.org/)).
- Luca Mezzalira, *Building Micro-Frontends*, 2nd edition, O'Reilly, October 2025, 454 pages ([O'Reilly](https://www.oreilly.com/library/view/building-micro-frontends-2nd/9781098170776/)). I did not read the book. Its recommendations are not summarized here.

## Gotchas

- The MF 2.0 `requiredVersion` doc says a mismatch warns and uses "the smallest version available". The runtime source falls back to the consumer's own copy for non-singletons and warns only for singletons. Trust the source.
- The webpack docs say singletons use "the highest semantic version". The runtime keeps an already-loaded version even if a higher one registers later, so load order still matters.
- Sharing `react` without `react/` or `react-dom/` prefixes quietly duplicates React through subpath imports.
- single-spa's docs still say import maps "are not supported in all browsers"; that was true before Safari 16.4 (2023).
- Cross-zone `<Link>` in Multi-Zones tries a soft navigation that cannot work. Use `<a>`.

## Uncertainties

- MF 2.0 non-singleton fallback order: "first registered satisfying version" comes from iterating object entries in `share.ts` on `main`. I did not check whether a tagged 2.9.2 release differs.
- Whether `nextjs-mf` works with Next.js 16 at all: the issue says "TBD", and the docs list support up to ^15.
- iframe auto-sizing: stated from memory. I did not check for newer CSS proposals.
- Mezzalira's 2nd edition contents and exact ISBN (listings show 9781098170776 and 9781098170783).
- Vercel Microfrontends pricing changes often. Only plan availability is stated above.

## Facts the page may state

- Module Federation's shared negotiation picks the highest version in the share scope that satisfies the consumer's `requiredVersion`. `requiredVersion` defaults to the range in the consumer's `package.json`.
- Without `singleton`, a consumer with no compatible version in the scope falls back to its own bundled copy, so two versions can run on one page.
- With `singleton: true`, one version is used for everyone. A consumer whose range it doesn't satisfy gets a console warning, or a runtime error if `strictVersion: true`.
- `eager: true` puts a shared module in the initial chunk. Without it, the app needs an async bootstrap boundary.
- `remoteEntry.js` is the conventional name of the container entry a remote emits. MF 2.0 adds `mf-manifest.json`, which also lists assets, shared deps and types.
- MF 2.0 can register remotes at runtime (`registerRemotes`, `loadRemote`) and extend loading with runtime plugins.
- `@module-federation/nextjs-mf` is in maintenance mode, Pages Router only. Next.js documents Multi-Zones: separate apps per path set, each with an `assetPrefix`, joined by `rewrites`, with hard navigations between zones.
- Import maps work in all current evergreen browsers, and multiple import maps merge into one global map (Chrome 133, Firefox 150, Safari 18.4).
- single-spa 6.x is the stable line and 7.0 is still in beta. Its docs recommend import maps for shared frameworks.
- SSI and ESI compose HTML fragments on the server or CDN. Podium is maintained. Zalando's Tailor is archived.
- Shadow DOM blocks selectors in both directions, but inherited properties and CSS custom properties cross the boundary, and `::part()` exposes chosen elements.
- iframes give full isolation at the cost of memory, harder routing and deep links, manual sizing, and a required `title` for accessibility.
- Common guidance: split by business domain with one team owning each part, avoid shared state, communicate through the URL or custom events, deploy independently, and share only a UI-only design system.

## Sources
- webpack: https://webpack.js.org/plugins/module-federation-plugin/, https://webpack.js.org/concepts/module-federation/, source at https://github.com/webpack/webpack/tree/v5.112.0/lib/sharing
- Module Federation 2.0: https://module-federation.io/configure/shared.html, /configure/shareStrategy.html, /configure/manifest.html, /configure/runtimeplugins.html, /guide/basic/manifest-snapshot.html, /guide/runtime/runtime-api.html, /integrations/framework/nextjs/index.html, /integrations/build-tool/vite.html; source https://github.com/module-federation/core/blob/main/packages/runtime-core/src/utils/share.ts; issue https://github.com/module-federation/core/issues/3153
- Rspack: https://rspack.rs/guide/advanced/module-federation.html
- Native Federation: https://native-federation.com/, https://cdn.jsdelivr.net/npm/@angular-architects/native-federation@22.2.3/README.md
- Next.js Multi-Zones: https://nextjs.org/docs/app/guides/multi-zones (local copy in `node_modules/next/dist/docs/01-app/02-guides/multi-zones.md`); Vercel: https://vercel.com/docs/microfrontends
- Import maps: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap, https://github.com/mdn/browser-compat-data
- single-spa: https://single-spa.js.org/docs/recommended-setup/, https://github.com/single-spa/single-spa/releases
- SSI/ESI/Podium/Tailor/edge: https://nginx.org/en/docs/http/ngx_http_ssi_module.html, https://www.w3.org/TR/esi-lang/, https://podium-lib.io/, https://github.com/zalando/tailor, https://blog.cloudflare.com/fragment-piercing/
- Shadow DOM: https://drafts.csswg.org/css-shadow-1/, https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::part
- iframes: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
- Guidance: https://martinfowler.com/articles/micro-frontends.html, https://micro-frontends.org/, https://www.oreilly.com/library/view/building-micro-frontends-2nd/9781098170776/
- Versions: https://registry.npmjs.org/{webpack,@module-federation/enhanced,@module-federation/vite,@module-federation/nextjs-mf,@originjs/vite-plugin-federation,@angular-architects/native-federation,@softarc/native-federation,single-spa,systemjs,@podium/layout,@rspack/core,next,@vercel/microfrontends}
