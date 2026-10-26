---
slug: cloudflare-deploy
status: done
branch: main
created: 2026-10-12
---

# Quick Task: Deploy to Cloudflare Workers at learn.huyle.work

## What

Deploy the app to Cloudflare Workers with the OpenNext adapter, served on the custom domain `learn.huyle.work`, mirroring the portfolio (`huyle.work`) setup.

## Files

- package.json (add `@opennextjs/cloudflare`, `wrangler`; `preview`/`deploy`/`cf-typegen` scripts)
- wrangler.jsonc (new: worker name, assets, `learn.huyle.work` custom domain route)
- open-next.config.ts (new)
- next.config.ts (dev-time Cloudflare bindings)
- .gitignore (`.open-next`, `.wrangler`)

## Expected Outcome

`pnpm run deploy` builds with OpenNext and deploys a Worker reachable at https://learn.huyle.work.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build (and `opennextjs-cloudflare build`)
