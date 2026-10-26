---
paths:
  - "apps/learn-english/**"
  - ".artifacts/features/learn-english/**"
  - ".artifacts/quick/learn-english/**"
  - ".agents/baselines/learn-english/**"
---

# Spec-Driven Development (SDD)

Learn English (`apps/learn-english`) is developed spec-first. Code and specs must
stay in sync: every behavior in `apps/learn-english/src/` is described by a
feature spec or a baseline.

## Always use the `spec-driven` skill

Invoke the `spec-driven` skill (Skill tool) **before** writing code for any
feature, change, or bug fix. Let it auto-size the depth:

| Scope | Flow |
|-------|------|
| Small (≤3 files, one sentence: bug fix, config, tweak) | Quick mode → `.artifacts/quick/learn-english/NNN-{slug}/` |
| Medium (clear feature, <10 steps) | spec → implement → verify → audit |
| Large / Complex | spec → (discuss) → design → tasks → implement → verify → audit |

Do not skip straight to code, even when the request sounds trivial: start
with quick mode at minimum.

## Where things live

```
.artifacts/
├── features/learn-english/{ID}-{name}/   spec.md (WHAT) · decisions.md (WHY) · design.md (HOW) · tasks.md (WHEN)
├── quick/learn-english/NNN-{slug}/       task.md · summary.md
└── research/{topic}.md                    reusable research cache (shared by all apps)
.agents/
├── baselines/learn-english/{area}.md     behavior of code that existed before its spec
└── knowledge.md                           cross-feature decisions, gotchas, codebase feedback
```

Paths inside this app's specs and knowledge entries are relative to
`apps/learn-english/` unless they start with `apps/`. Work that spans more than
one app or the workspace goes in the `repo/` groups instead (see the root `CLAUDE.md`).

## Rules

- Feature IDs are sequential (`001`, `002`, …) within the learn-english group and
  never reused. Check `.artifacts/features/learn-english/` for the next free ID.
- Status flow: `draft → ready → in-progress → to-review → done`. No skipping.
- Verify after every task/range, and mark acceptance criteria `[x]` in
  `spec.md` only when proven. Run `pnpm typecheck && pnpm lint && pnpm build`
  (from the repo root, or with `--filter learn-english`) as the minimum
  quality gate.
- **Changing existing behavior = update the spec first.** If code behaves
  differently from its spec/baseline, fix one or the other in the same change.
  Never leave them out of sync.
- When touching code that has no spec yet, check `.agents/baselines/learn-english/` first.
  If no baseline covers it, capture one with the skill (baseline capture)
  before modifying it.
- Record cross-feature decisions and gotchas in `.agents/knowledge.md` under the
  `### learn-english` subsection of each section, using the skill's format
  (keep all three section headers).
- Templates in the skill are the structural source of truth; existing
  artifacts are context only.
