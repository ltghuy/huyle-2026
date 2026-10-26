---
slug: cloudflare-deploy
completed: 2026-10-12
---

# Summary: Deploy to Cloudflare Workers at learn.huyle.work

## What Changed

Added the OpenNext Cloudflare adapter and a Wrangler config so the app deploys as a Worker (`react-practices`) bound to the custom domain `learn.huyle.work`, the same setup as the portfolio on `huyle.work`. `pnpm run deploy` builds and deploys; `pnpm preview` runs it locally on workerd. Lint, typecheck, `opennextjs-cloudflare build` and a local `wrangler dev` smoke test (`/` 200, `/practices` 308 redirect) pass.

## Files Modified

| File | Change |
|------|--------|
| package.json / pnpm-lock.yaml | `@opennextjs/cloudflare`, `wrangler` dev deps; `preview`, `deploy`, `cf-typegen` scripts |
| pnpm-workspace.yaml | allow `esbuild` and `workerd` build scripts |
| wrangler.jsonc | new: worker name, assets binding, `learn.huyle.work` custom-domain route |
| open-next.config.ts | new: default Cloudflare config |
| next.config.ts | `initOpenNextCloudflareForDev()` for dev-time bindings |
| .gitignore | `.open-next/`, `.wrangler/`, `.dev.vars*` |

## Patterns Discovered

None.

## Follow-Up

- First deploy needs `wrangler login` with the account that owns the `huyle.work` zone.
- File-upload practice keeps sessions on `globalThis` and files in `tmpdir()`. On Workers, isolates are not shared and `/tmp` is per-request, so resumable uploads may lose state between requests in production.
