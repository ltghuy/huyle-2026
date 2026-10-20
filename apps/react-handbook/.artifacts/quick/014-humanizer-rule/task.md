---
slug: humanizer-rule
status: done
branch: main
created: 2026-10-20
---

# Quick Task: Require the humanizer skill for all written content

## What

Add a rule that every piece of prose in the repo is written or rewritten with the `humanizer:humanizer` skill.

## Files

- .claude/rules/06-writing-content.md
- CLAUDE.md

## Expected Outcome

Agents load the humanizer skill before writing page text, UI copy, docs, spec prose, commit messages or PR descriptions. CLAUDE.md lists the skill and the new rule file.

## Quality Gates

Run after the change, before marking done:

- Rule file is listed in CLAUDE.md and loads with the other rules (no code changed, so lint, typecheck and build are unaffected)
