---
id: 038
feature: admin
created: 2026-11-09
---

# Decisions: Admin page

## Resolved

### Content edits and the git source of truth

- **Question:** `content:publish` makes D1 match `content/*.json`, so a D1 edit would be undone by the next publish. How do admin edits work?
- **Decision:** Admin writes D1 directly (live at once, new content version) and marks the row `admin_edited_at`. A new `pnpm content:pull` writes marked rows back into the JSON files and clears the mark. Publish refuses to run while any row is marked.
- **Rationale:** Owner's choice; edits are live at once and git stays the long-term record.
- **Caveats:** The owner must pull and commit after editing in admin, before the next publish.

### Approving claims

- **Question:** Approve in D1 at once, or record decisions for the script?
- **Decision:** Straight into D1: the wording item is created or extended (and marked edited, so `content:pull` brings it into `content/wording/*.json`).
- **Rationale:** Owner's choice; one place to decide.

### Who is an admin

- **Question:** How does someone become an admin?
- **Decision:** `is_admin` column set by the owner with SQL; `input: false` in Better Auth so no sign-in or profile request can set it. Routes re-read it from D1 on every request because the session cookie is cached for minutes.
- **Rationale:** One owner; no UI needed.

### Body editing

- **Question:** Forms per kind, or a JSON editor?
- **Decision:** JSON editor for the body, plain fields for level, topic and sort, checked server-side by `contentItemSchema`.
- **Rationale:** Eight kinds with nested bodies; forms for each would be most of the work for an owner-only page.
