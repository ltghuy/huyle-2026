---
area: api-scaffold
scope: Initial backend scaffold: health check, env validation, HTTP helpers (todos sample removed in quick 005)
captured: 2026-10-06
---

# Baseline: API Scaffold

## Scope

The backend that existed before SDD was adopted: a liveness endpoint, a
sample todos resource (since removed), environment validation, and shared HTTP response
helpers. The frontend home page is still the default `create-next-app`
page and is out of scope.

**Directories:** `src/app/api/`, `src/server/`, `src/lib/http.ts`

## Current Behavior

### Health check

- `GET /api/health` returns `200` with `status: "ok"`, the configured app
  name, and the current server timestamp (ISO 8601).
- Rendered on every request, never cached.

### Todos resource (removed)

- The sample `/api/todos` resource (`src/app/api/todos`, `src/server/todos`)
  was deleted in quick task 005. `/api/todos` now returns `404`. Practice
  APIs under `/api/practices/*` follow the same thin-route → service pattern.

### Error contract

- Every error response has the shape `{ error: { message, issues? } }`.
- A body that isn't valid JSON returns `400` with "Invalid JSON body".
- A body that fails schema validation returns `422` with "Validation failed"
  and a field-level tree of issues.
- An unsupported HTTP method returns `405` (framework default).

### Environment

- Environment variables are validated when the server module first loads.
  Invalid values stop the server with a logged error tree.
- The validated env can only be used server-side.

## Dependencies

### Depends On

| Dependency | Nature |
|------------|--------|
| Next.js route handlers | HTTP routing and Web Request/Response |
| zod | Input and env validation, error trees |
| server-only | Build-time guard against client imports |

### Depended On By

| Dependent | Nature |
|-----------|--------|
| (none yet) | No UI consumes these endpoints yet |

## Configuration Surface

| Setting | Purpose | Current |
|---------|---------|---------|
| `NODE_ENV` | Runtime mode | `development` by default |
| `APP_NAME` | Name reported by health check | `react-practices` by default |

## Gaps

- No persistence layer (database).
- No authentication or authorization on any endpoint.
- No automated tests.

## Risks

- In-memory state appears to behave inconsistently in serverless or
  multi-instance deployments.

## Tech Debt

- No test runner is configured.

## Notes

The first real feature spec should be `001`.
