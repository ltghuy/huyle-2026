---
paths:
  - "apps/react-handbook/**"
  - ".artifacts/features/react-handbook/**"
  - ".artifacts/quick/react-handbook/**"
  - ".agents/baselines/react-handbook/**"
---

# Writing Content

## Always use the `humanizer:humanizer` skill

Invoke the `humanizer:humanizer` skill (Skill tool) **before** you write or
rewrite any prose, and check the result against it before you finish. This is
required for every piece of content, however short.

It covers:

- Page and topic text: intros, points, advice, captions, figure descriptions,
  `<title>`/`<desc>` text in SVGs, and catalog titles and summaries
- UI copy in demos and components: labels, help text, empty and error states,
  results and explanations
- Practice guides and handbook pages in `apps/react-handbook/src/practices/*` and `apps/react-handbook/src/handbook/*`
- `README.md` and other docs
- Spec artifacts (`.artifacts/**/react-handbook/**`, `.agents/**`) where they hold prose
- Commit messages and pull request descriptions (use the skill's embedded mode)

## How to apply it

- Write the draft, run it through the skill's checks, then put only the final
  text in the file. Code, identifiers, paths, URLs and quoted tool output stay
  unchanged.
- Keep the facts. Don't add a claim, number or name the source doesn't support
  just to make a sentence read better.
- Match the voice of the surrounding content on the page. For reference and
  technical text, that means plain and neutral.
- No em or en dashes in new prose. Avoid "not X but Y" contrasts, one-line
  closers, forced lists of three and bold labels on every item.

When you edit existing text, humanize the sentences you touch. Rewrite
untouched sections only when the task asks for it.

Doesn't apply to generated shadcn files in `apps/react-handbook/src/components/ui/`.
