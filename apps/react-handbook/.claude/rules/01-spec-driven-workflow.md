# Spec-Driven Development (SDD)

This repo is developed spec-first. Code and specs must stay in sync: every
behavior in `src/` is described by a feature spec or a baseline.

## Always use the `spec-driven` skill

Invoke the `spec-driven` skill (Skill tool) **before** writing code for any
feature, change, or bug fix. Let it auto-size the depth:

| Scope | Flow |
|-------|------|
| Small (≤3 files, one sentence: bug fix, config, tweak) | Quick mode → `.artifacts/quick/NNN-{slug}/` |
| Medium (clear feature, <10 steps) | spec → implement → verify → audit |
| Large / Complex | spec → (discuss) → design → tasks → implement → verify → audit |

Do not skip straight to code, even when the request sounds trivial: start
with quick mode at minimum.

## Where things live

```
.artifacts/
├── features/{ID}-{name}/   spec.md (WHAT) · decisions.md (WHY) · design.md (HOW) · tasks.md (WHEN)
├── quick/NNN-{slug}/       task.md · summary.md
└── research/{topic}.md     reusable research cache
.agents/
├── baselines/{area}.md     behavior of code that existed before its spec
└── knowledge.md            cross-feature decisions, gotchas, codebase feedback
```

## Rules

- Feature IDs are sequential (`001`, `002`, …) and never reused. Check
  `.artifacts/features/` for the next free ID.
- Status flow: `draft → ready → in-progress → to-review → done`. No skipping.
- Verify after every task/range, and mark acceptance criteria `[x]` in
  `spec.md` only when proven. Run `pnpm typecheck && pnpm lint && pnpm build`
  as the minimum quality gate.
- **Changing existing behavior = update the spec first.** If code behaves
  differently from its spec/baseline, fix one or the other in the same change.
  Never leave them out of sync.
- When touching code that has no spec yet, check `.agents/baselines/` first.
  If no baseline covers it, capture one with the skill (baseline capture)
  before modifying it.
- Record cross-feature decisions and gotchas in `.agents/knowledge.md` using
  the skill's format (keep all three section headers).
- Templates in the skill are the structural source of truth; existing
  artifacts are context only.
