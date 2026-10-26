---
paths:
  - "apps/learn-english/**"
  - ".artifacts/features/learn-english/**"
  - ".artifacts/quick/learn-english/**"
---

# Writing Content

## UI copy is Vietnamese

- Every learner-facing string (labels, buttons, help text, empty and error
  states, toasts, API error messages, page titles) is natural Vietnamese with
  full diacritics. Only the English being taught (words, example sentences,
  grammar terms such as "Present Perfect") stays in English.
- Address the learner as "bạn". Keep sentences short and friendly; avoid
  machine-translated phrasing.
- Reuse the same Vietnamese term for the same thing everywhere (e.g. "Ôn tập"
  for review, "Từ khó" for hard words, "Bài học hôm nay" for the daily lesson).

## English prose uses the `humanizer:humanizer` skill

Invoke the `humanizer:humanizer` skill before writing or rewriting English
prose: docs, spec artifacts, code comments longer than a line, commit messages
and pull request descriptions. Keep the facts; no em or en dashes in new prose.

## Course content

Words, sentences and grammar lessons live in `apps/learn-english/content/`,
are drafted by the content scripts and must be approved by the owner before
they are published. Don't hand-edit approved items without flagging them for
re-review.

Doesn't apply to generated shadcn files in `apps/learn-english/src/components/ui/`.
