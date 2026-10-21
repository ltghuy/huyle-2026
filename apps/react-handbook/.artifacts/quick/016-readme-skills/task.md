---
slug: readme-skills
status: done
branch: main
created: 2026-10-21
---

# Quick Task: Document how to install the agent skills the rules require

## What

Add a README section that lists the four skills `.claude/rules/` requires, says when each one is used, and gives the install command for each.

## Files

- README.md

## Expected Outcome

A new contributor using Claude Code can install `spec-driven`, `vercel-react-best-practices`, `ui-ux-pro-max` and `humanizer:humanizer` from the README alone, and the skill names match the ones the rules invoke.

## Quality Gates

Run after the change, before marking done:

- Docs only, so lint, typecheck and build are unaffected. Check the commands against each skill's upstream README.
