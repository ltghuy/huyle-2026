---
id: 005
feature: react-handbook-import
created: 2026-10-26
---

# Decisions: React Handbook Import

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### App name and source

- **Question:** What comes over, and under what name?
- **Decision:** The `react-practices` project (GitHub `ltghuy/react-mastering`, 83 commits) becomes a second app named `react-handbook`, beside the portfolio.
- **Rationale:** User request. The handbook is already deployed as the Cloudflare Worker `react-handbook` on `learn.huyle.work`, so the name matches.
- **Caveats:** The old repository is left untouched; archiving it is the owner's call after the move.

### Git history

- **Question:** Import full history or a snapshot?
- **Decision:** Full history. All commits come over with their paths rewritten into the app's folder, so log and blame work on the moved files.
- **Rationale:** User choice ("Keep full history").
- **Caveats:** The import adds a second root commit to the history; that is expected.

### Spec / artifact numbering

- **Question:** Both repos number features and quick tasks from 001. How to merge?
- **Decision:** One artifacts folder per app (`react-handbook`, `web`), plus a `repo` folder for cross-app work. Existing IDs keep their numbers inside their folder; numbering continues per folder.
- **Rationale:** User choice ("Folder per app"). No ID or cross-reference inside the 48 handbook features / 26 quick tasks has to change.
- **Caveats:** This departs from the spec-driven skill's flat layout; the project instructions must say where new specs go. The portfolio's 001 and the monorepo move (004) move to `web` and `repo` respectively. This feature (005) is the first written in `repo/`.

### Agent rules scope

- **Question:** The handbook's six rules are unscoped. Which code do they govern?
- **Decision:** All six apply only inside the handbook app. The portfolio keeps its i18n rule, scoped to its own app.
- **Rationale:** User choice ("Scope all to handbook"). Neither app's current guidance changes.
- **Caveats:** Path scoping must use the frontmatter key Claude Code actually honors (to verify in design; the portfolio's rule uses `appliesTo`).

### Knowledge base

- **Question:** Two `.agents/knowledge.md` files with the same three sections. Merge how?
- **Decision:** One file, same three sections, with every entry tagged by app; handbook baselines move alongside the existing ones.
- **Rationale:** User asked to merge the duplicate folders; the spec-driven skill expects one knowledge file.

### Deploy

- **Question:** How does the handbook deploy after the move?
- **Decision:** Keep the `react-handbook` Worker on `learn.huyle.work`, connect its Workers Builds to this repo, and use build watch paths so each Worker only rebuilds for its own app (or shared code). Drop the Railway config.
- **Rationale:** User choice ("Workers Builds here").
- **Caveats:** Dashboard changes are owner-only and must be ordered so neither site breaks (lesson from 004: confirm the build log's command line, not just a green badge).

## Tentative

### Dependency versions

- **Question:** The handbook uses newer Next (16.3.8 vs 16.3.0), Playwright (1.64.1 vs 1.62.1), OpenNext and wrangler than the portfolio. Align?
- **Tentative Decision:** Keep each app on its own versions for the import; align in a separate change.
- **Revisit when:** Two Playwright versions cause browser-install friction, or a shared package needs one Next version.

### Branching

- **Tentative Decision:** Work on `main`, commit locally, push only with owner approval (current working agreement).
- **Revisit when:** The owner asks for a branch/PR.
