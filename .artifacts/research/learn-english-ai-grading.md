---
topic: learn-english-ai-grading
researched_at: 2026-10-26
version: "@anthropic-ai/sdk (latest at implementation time; pin exact)"
sources_hash: "claude-api skill 2.1.310 (models cached 2026-10-06)"
ttl_days: 90
keywords:
  - claude
  - grading
  - structured-outputs
  - prompt-caching
  - batches
---

# Claude API for written-answer grading and content drafting

> Researched: 2026-10-26

## Summary

Use the official TypeScript SDK (`@anthropic-ai/sdk`) for both runtime grading
(from the Worker) and bulk content drafting (local Node script). Grading uses
`client.messages.parse()` with a Zod output format so the response is validated
against a schema; the static grading instructions go in a cached system prompt.
Drafting ~5,000 words of content fits the Message Batches API (50% price, async,
results keyed by `custom_id`).

## Key Information

- Models (cached 2026-10-06): Claude Opus 5.5 `claude-opus-5-5` ($4 / $20 per MTok,
  cache reads $0.20), Claude Sonnet 5.5 `claude-sonnet-5-5` ($2 / $10), Claude Haiku 5.5
  `claude-haiku-5-5` ($0.10 / $0.50). Skill default is Opus 5.5; downgrading for cost is
  the owner's call, not ours.
- Opus 5.5: thinking cannot be disabled (`{type:"disabled"}` and `budget_tokens` are 400s);
  latency/cost is controlled with `output_config.effort` (default `medium`; `low` for
  short, latency-sensitive tasks like grading one sentence).
- Structured outputs: `output_config: { format: zodOutputFormat(Schema) }` on
  `client.messages.parse(...)`; `response.parsed_output` is null if parsing failed (guard it).
  The old `output_format` param is deprecated.
- Forced `tool_choice` (`any`/`tool`) is a 400 on Opus 5.5 / Sonnet 5.5; use structured outputs instead.
- No assistant prefill (400) on current models.
- `temperature`/`top_p`/`top_k` are rejected on current models — don't send them.
- Prompt caching: prefix match (tools → system → messages). Minimum cacheable prefix on
  Opus 5.5 / Sonnet 5.5 / Haiku 5.5 is 512 tokens. Put `cache_control: {type:"ephemeral"}`
  on the static system prompt; verify with `usage.cache_read_input_tokens`.
  Any dynamic value (date, learner name) in the system prompt silently breaks caching —
  keep per-request data in the user message.
- Batches: up to 100,000 requests / 256 MB per batch, most finish < 1h (max 24h),
  results kept 29 days, 50% off, results arrive in any order — key by `custom_id`.
- Refusals: on Opus 5.5 check `stop_reason === "refusal"` before reading content; the skill
  recommends server-side fallbacks (`betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`).
- SDK errors: catch typed classes most-specific first (`RateLimitError`, `APIConnectionError`,
  `APIError`), not string matching. Default `maxRetries` 2, TS timeout in ms.

## Implementation Notes

- Grading schema (Zod): `isCorrect: boolean`, `corrected: string`, `mistakes: [{ original, correction,
  type: enum(grammar|vocabulary|spelling|word_order|punctuation|meaning), explanationVi, relatedItemId: string|null }]`,
  `overallFeedbackVi: string`. `relatedItemId` must come from a list of candidate item IDs
  passed in the user message (the lesson's words / grammar point), never invented — validate server-side
  that it exists, drop it otherwise.
- Set a request timeout of ~9s and `maxRetries: 0`–1 on the grading route so the 10s
  budget (AC-034) holds; on timeout return a "feedback unavailable" result so the learner can skip.
- Treat the learner's answer as data: wrap it in a delimited block in the user message and
  tell the system prompt it is untrusted text to grade, not instructions.
- Content drafting script: one batch request per word (custom_id = word id) asking for
  Vietnamese meanings, 1–2 example sentences + Vietnamese translations, topic tag; one per
  grammar topic for lessons. Write results to versioned JSON in the repo for owner review.

## Gotchas

- Opus 5.5's effort default is `medium`, not `high` — set it explicitly.
- `parsed_output` can be null — never assume.
- A system prompt under 512 tokens won't cache, silently.

## Integration Constraints

- **SDK**: `@anthropic-ai/sdk`, `client.messages.parse`, `client.messages.batches.create/retrieve/results`; Zod helper at `@anthropic-ai/sdk/helpers/zod`.
- **Environment variables**: `ANTHROPIC_API_KEY` as a Worker secret (`wrangler secret put`) for runtime; in the local shell for scripts.
- **Runtime constraints**: the SDK is fetch-based; running inside Cloudflare Workers is expected to work but must be smoke-tested under `opennextjs-cloudflare preview` (see Uncertainties).
- **Error modes**: 429/5xx retried by SDK; refusal returns HTTP 200 with `stop_reason: "refusal"`; parse failure → `parsed_output: null`.

## Recommendations

- Grading: `claude-opus-5-5`, `effort: "low"`, structured output, cached system prompt, 9s timeout.
  Offer the owner `claude-haiku-5-5` as the lower-cost option (~40× cheaper input) if
  quality holds on a small eval set; the switch is one constant.
- Drafting: Batches API with `claude-opus-5-5` (quality matters, owner reviews anyway).

## Uncertainties

- Exact latency of Opus 5.5 at `low` effort for a ~100-token answer — measure before launch.
- Workers-runtime compatibility of the current SDK version — verify in `cf:preview`.
- Whether Zod 4 (used in the repo) is accepted by `zodOutputFormat` in the pinned SDK version.

## Sources

- claude-api skill (bundled 2.1.310): SKILL.md model table, thinking/effort table, structured outputs, prompt caching, batches docs (`typescript/claude-api/tool-use.md`, `typescript/claude-api/batches.md`, `shared/prompt-caching.md`).
