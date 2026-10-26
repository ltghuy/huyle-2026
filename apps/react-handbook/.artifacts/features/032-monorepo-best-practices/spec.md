---
id: "032"
feature: monorepo-best-practices
type: brownfield
scope: medium
status: done
branch: main
created: 2026-10-20
---

# Feature: Monorepo best practices

## Overview

The monorepo case study explains why a repo needs layers, boundaries and
owners, but a reader who has to set one up still asks the practical
questions: which folders go at the top, what a package is allowed to contain,
how names and entry points should look, and how to write a CODEOWNERS file that
routes reviews to the right team. This adds a seventh topic to the case study
that answers those questions as a set of rules, each with its reason, applied
to the same sample repo the other demos use.

## Goals

- [x] A reader can lay out a new frontend monorepo from the topic alone: top-level folders, package shape and naming, layers, shared config, and code owners.
- [x] The topic's demo lets the reader inspect every folder of the sample repo and test which CODEOWNERS rule owns any path, including the ordering mistake that sends reviews to the wrong team.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rules for one specific tool's config files | The page stays tool-neutral; tools appear only as examples |
| The full CODEOWNERS pattern syntax | The tester covers the common patterns and is labelled simplified |
| Branch protection setup steps | Linked to the provider's docs instead |

## User Stories

### P1: Read the practices

- As an engineer setting up a monorepo, I want a short list of structure, layer, naming, config and ownership rules with the reason for each, so that I can apply them without reading the whole case study again.
- **Why P1:** It is the content the topic exists for.
- **Independent Test:** Open the topic from the page's table of contents and read rules on top-level folders, package shape, naming and entry points, layers, shared config and tooling, and code owners.

**Acceptance Criteria:**

- [x] AC-001: WHEN the page opens THEN its table of contents SHALL list a seventh topic on best practices, and the topic SHALL appear after the CI topic.
- [x] AC-002: WHEN the topic is shown THEN it SHALL cover top-level folders (apps, packages, tooling), what a package contains (one purpose, its own manifest, a declared public entry point), naming (one scope, name matches folder), layers and their direction, shared config as packages, pinned tool versions, and code owners, each with its reason.
- [x] AC-003: WHEN the topic is shown THEN it SHALL end with do/avoid advice and links to the provider's CODEOWNERS docs and at least one other reference.

### P1: Explore the layout

- As a reader, I want to pick any folder of the sample repo and see what belongs there so that the rules map onto a real tree.
- **Why P1:** Rules without a tree to apply them to stay abstract.
- **Independent Test:** Pick `packages/ui` and see its purpose, layer, owner and what it may import; pick a top-level tooling file and see why it lives at the root.

**Acceptance Criteria:**

- [x] AC-004: WHEN the reader selects an entry in the repo tree THEN the demo SHALL show its purpose, its layer (for projects), its owning team, and which layers it may import, using the same projects and rules as the boundaries demo.
- [x] AC-005: WHEN the reader uses the keyboard THEN they SHALL be able to move through the tree entries and select one.

### P1: Test CODEOWNERS

- As a reader, I want to enter a path and see which CODEOWNERS line owns it, so that I understand how the rules are matched.
- **Why P1:** The ordering rule (the last match wins) is the most common CODEOWNERS mistake and is hard to see without trying it.
- **Independent Test:** Enter `packages/ui/src/button.tsx` and see every matching line with the last one marked as the owner; switch to the wrongly ordered file and see the catch-all rule win instead.

**Acceptance Criteria:**

- [x] AC-006: WHEN the reader enters or picks a path THEN the demo SHALL mark every CODEOWNERS line that matches it and name the owners from the last matching line.
- [x] AC-007: WHEN the reader switches to a file with the broad rule written last THEN the demo SHALL show the broad rule's owners winning for paths a team rule also matches, and say why.
- [x] AC-008: WHEN no line matches a path THEN the demo SHALL say the path has no owner and needs no code-owner review.

## Edge Cases

- WHEN the entered path is empty THEN the tester SHALL ask for a path instead of showing a result.
- WHEN the path starts with a slash or has surrounding spaces THEN the tester SHALL treat it as the same repo path.
- WHEN the page is viewed at 360 px THEN the tree, the CODEOWNERS file and the results SHALL fit or scroll inside their own region without page-level horizontal scroll.

## Success Criteria

- [x] For each sample path, the tester names the same owner GitHub's documented rule (last match wins) would.
- [x] The topic passes axe in light and dark at desktop and 360 px, with no page-level horizontal scroll.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

- The new text follows the humanizer rules (no stock contrasts, closers, decorative bold or dashes).
- CODEOWNERS facts come from the provider's documentation in the existing monorepo research notes.

## Baseline

### Current Behavior

- The monorepo case study has six topics. Ownership and CODEOWNERS appear as one point in the boundaries topic, and the sample repo's folders appear only as boxes in the graph.

### Gaps / Limitations

- No topic says how to lay out the folders, shape and name packages, or write a CODEOWNERS file, and there is no way to try CODEOWNERS matching.
