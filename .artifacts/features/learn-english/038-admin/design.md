---
id: 038
feature: admin
created: 2026-11-09
---

# Technical Design: Admin page

## Scope

See spec.md. A static `/admin` shell in the `(app)` group with three tabs (`?tab=overview|claims|content`), client components calling `/api/admin/*`; one migration; one script; a guard in `publish-content`.

## Research Summary

No new technology. Design direction (ui-ux-pro-max, "data-dense dashboard"): compact KPI cards, tables with row hover in an `overflow-x-auto` wrapper (cards stack on phones), status shown with icon + word (success / warning / destructive tokens), app fonts and shadcn tokens unchanged.

## Patterns & Reuse

| Pattern | Project Uses | Reference |
|---------|-------------|-----------|
| Route | `requireUser` → `readBody` → service, Vietnamese `{ error }`, `no-store` | `src/app/api/social/friends/remove/route.ts` |
| Service | `import "server-only"`, takes `db`, read batch + write batch | `src/server/social/friends.service.ts` |
| Content rules | `contentItemSchema` | `src/content/schema.ts` |
| Claim grouping, accepted keys | `claimKey`, `answerKeys` | `src/learning/exercises/translate.ts`, `scripts/claims.ts` |
| Client fetch | typed client with a Vietnamese error class | `src/lib/social-client.ts` |

## Data Model

Migration `0010_admin.sql`:

- `user.is_admin INTEGER NOT NULL DEFAULT 0`
- `content_items.admin_edited_at INTEGER` (null = matches the repo)

A save is one `db.batch()`: bump `content_meta.version` (+ `published_at`, `counts` recomputed by SQL), then upsert the item with `updated_version = (SELECT version FROM content_meta WHERE id = 1)` and `admin_edited_at = now`. Old `?v=` cache keys stay valid; the new version is a new key.

### API Contracts

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/admin/overview` | GET | `?range=today\|week\|month` | `AdminOverview` |
| `/api/admin/claims` | GET | none | `{ groups: ClaimGroup[] }` |
| `/api/admin/claims/decide` | POST | `{ ids, decision: "approve"\|"reject"\|"drop", explanationVi? }` | `{ changed }` |
| `/api/admin/content` | GET | `?kind&level&q&page` | `{ items, total, page }` |
| `/api/admin/content/item` | GET | `?id` | `{ item }` |
| `/api/admin/content/item` | POST | `{ item, create }` | `{ item }` or 422 with issues |
| `/api/admin/content/remove` | POST | `{ id, removed }` | `{ ok }` |

## Component Design

| Component | File | Action |
|-----------|------|--------|
| Migration + schema columns | `migrations/0010_admin.sql`, `src/server/db/schema.ts` | new / modify |
| Better Auth field | `src/server/auth/auth.ts` (`isAdmin`, `input: false`) | modify |
| `requireAdmin` | `src/server/admin/require-admin.ts` | new |
| Schemas | `src/server/admin/admin.schema.ts` | new |
| Services | `src/server/admin/{overview,claims,content}.service.ts` | new |
| Routes | `src/app/api/admin/**/route.ts` | new |
| Client | `src/lib/admin-client.ts` | new |
| Page | `src/app/(app)/admin/page.tsx` (static, noindex) | new |
| UI | `src/components/admin/{admin-screen,overview-tab,claims-tab,content-tab,content-editor}.tsx` | new |
| Sidebar link | `src/components/shell/nav.ts`, `app-sidebar.tsx` | modify |
| Pull script | `scripts/pull-content.ts` (+ `content:pull`) | new |
| Publish guard | `scripts/publish-content.ts` | modify |

## Data Flow

Admin page → `useAccount` (signed in?) → `/api/admin/overview` → 403 shows no-access, 200 renders. Saves call the item route; on success the list query is invalidated.

## Test Strategy

Vitest with `@/test-utils/sqlite-d1` for services (real SQL), mocked session for routes (every route refuses guests and non-admins), Testing Library for tabs, unit tests for the pull script's file placement and the publish guard.

## Considerations

- Security: `is_admin` read from D1 per request; body size capped; all input through Zod.
- Free plan: overview is one read batch; content save is one batch; claim decide is one read + one write batch.
