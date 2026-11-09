---
topic: learn-english-gemini-byok-grading
researched_at: 2026-11-09
version: "Gemini API v1beta generateContent; models gemini-3.5-flash-lite (primary), gemini-3.1-flash-lite (fallback); terms effective 2026-03-23"
sources_hash: 5060c1ea79a4
ttl_days: 90
keywords: [gemini, google-ai-studio, byok, generateContent, structured-output, responseJsonSchema, responseFormat, thinkingLevel, rate-limits, RESOURCE_EXHAUSTED, API_KEY_INVALID, cors, free-tier, data-usage, learn-english]
---

# Gemini API with the learner's own AI Studio key: browser-only grading

Checked on 2026-11-09. Primary sources are Google's own docs. The old `ai.google.dev/gemini-api/docs/*` and `ai.google.dev/api/*` URLs now 301-redirect to `aistudio.google.com/docs/*` and `aistudio.google.com/api-reference/*`; the generateContent pages are labelled "Gemini Generate Content API (Legacy)" in search titles, and the default docs now show the newer Interactions API. Facts marked "probe" were observed by calling the live API on 2026-11-09 with a deliberately invalid key (no real key was used, so no successful generation was observed). Anything not confirmed by a doc or a probe is listed under Uncertainties.

## Summary

- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, key in the `x-goog-api-key` header. `?key=` also works (probe). v1 path exists but the API reference documents only v1beta.
- CORS: the API answers preflight for any origin and echoes it back in `access-control-allow-origin`, allowing `content-type,x-goog-api-key` headers (probe). Plain `fetch` from the browser works.
- Google warns against putting keys in client code and recommends a backend proxy. In a bring-your-own-key app the key belongs to the learner, so the risk is theirs; say so in the UI.
- Model: `gemini-3.5-flash-lite` (stable, free tier, no shutdown date, structured output supported, default thinking level `minimal`). Fallback `gemini-3.1-flash-lite` (stable, free tier, shutdown May 7, 2027).
- Structured output on generateContent REST: the docs now show `generationConfig.responseFormat.text.{mimeType: "APPLICATION_JSON", schema}`. The SDK names `responseMimeType` + `responseJsonSchema` still appear in the API reference GenerationConfig.
- Thinking: Gemini 3.x uses `generationConfig.thinkingConfig.thinkingLevel`. Flash-Lite cannot fully turn thinking off; `minimal` is the lowest and already the default.
- Daily quota (RPD) resets at midnight Pacific time. Limits are per project, not per key.
- Invalid key: HTTP 400, `status: "INVALID_ARGUMENT"`, `details[].reason: "API_KEY_INVALID"` (probe). Leaked/blocked key or unverified free tier: 403 `PERMISSION_DENIED`.
- Free tier data is used to improve Google products and may be read by human reviewers. Users must be 18+. EEA, Switzerland and UK users may only be served through Paid Services.

## Key Information

### 1. Endpoint, auth, CORS

- API reference lists `POST /v1beta/models/{model}:generateContent` and `:streamGenerateContent`. It does not document a v1 equivalent. [api-reference]
- The API key page and every REST example send `x-goog-api-key: <key>`. The page does not mention `?key=`. [api-key, thinking]
- Probe: `GET /v1beta/models?key=<bad key>` returns the same `API_KEY_INVALID` error as the header form, so the query parameter is still accepted. Prefer the header so the key does not end up in URLs, logs or the Referer.
- Probe: `POST /v1/models/gemini-3.5-flash-lite:generateContent` with a bad key returns 400 (key error), not 404, so a v1 surface exists. Use v1beta, which is what the docs cover.
- Probe (CORS): `OPTIONS` preflight from `Origin: https://english.huyle.work` returned 200 with `access-control-allow-origin: https://english.huyle.work`, `access-control-allow-methods: DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT`, `access-control-allow-headers: content-type,x-goog-api-key`, `access-control-max-age: 3600`. A POST from `Origin: https://example.com` also got its origin echoed back. CORS works from arbitrary origins. Error responses carry CORS headers too, so the browser can read error bodies.
- Official warnings, paraphrased from the API key page: do not hardcode keys in web or mobile apps; keys shipped in client code can be pulled out by users; client apps should call through a backend proxy; treat the key like a password. Restrictions offered: limit a key to the Gemini API only (in AI Studio), and IP address restrictions in the Cloud console. The page does not describe HTTP referrer restrictions. [api-key]
- The troubleshooting page lists a leaked key as a 403 cause ("Your API key was reported as leaked. Please use another API key.") and again says not to embed keys in client-side code or public repos. [troubleshooting]

### 2. Models, free tier, shutdown dates

Text models relevant here, per the models and deprecations pages: [models, deprecations]

| Model id | Status | Shutdown | Free tier [pricing] | Paid, per 1M tokens in / out |
|---|---|---|---|---|
| `gemini-3.5-flash-lite` | Stable | None announced | Yes | $0.30 / $2.50 |
| `gemini-3.1-flash-lite` | Stable | May 7, 2027 (replacement `gemini-3.5-flash-lite`) | Yes | $0.25 / $1.50 |
| `gemini-3.6-flash` | Stable | None announced | Yes | $0.75 / $3.75 until Dec 31, 2026, then $1.50 / $7.50 |
| `gemini-3.8-flash` | Stable, newest Flash | None announced | Yes | same as 3.6 Flash |
| `gemini-2.5-flash-lite` | Not deprecated, but access limited to existing users | None announced | Yes | $0.10 / $0.40 |
| `gemini-2.5-flash` | Deprecated | Dec 1, 2026; requests then route to `gemini-3.5-flash-lite` | n/a | n/a |
| `gemini-3-flash-preview` | Preview | None announced, replacement `gemini-3.6-flash` | n/a | n/a |
| `gemini-3.5-flash`, `gemini-3.7-flash` | Removed from AI Studio; API routes to 3.6 Flash / 3.8 Flash | n/a | n/a | n/a |
| `gemini-3.1-flash-lite-preview`, `gemini-2.0-flash*` | Shut down (May 25, 2026 / June 1, 2026) | past | n/a | n/a |

- No `-latest` alias is listed in the model tables; `gemini-flash-latest` only appears as a naming example. Pin an explicit id. [models]
- Free tier RPM / TPM / RPD numbers are not published on the rate limits page any more. It says to view your active limits in AI Studio. The only free-tier row on the page is for Gemini Omni Flash ("Not supported"). [rate-limits]
- "Rate limits are applied per project, not per API key." [rate-limits]
- Troubleshooting mentions a 403 with `FREE_TIER_VERIFICATION_REQUIRED` when the free tier needs phone verification, and says some projects are not eligible for the free tier at all (fix: link billing; a new key in the same project will not help). [troubleshooting]

### 3. Structured output and thinking

Structured output on generateContent: [structured-output (generate-content=true)]

- REST, as now documented:

  ```json
  {
    "contents": [{ "parts": [{ "text": "..." }] }],
    "generationConfig": {
      "responseFormat": {
        "text": {
          "mimeType": "APPLICATION_JSON",
          "schema": { "type": "object", "properties": { ... }, "required": [ ... ] }
        }
      }
    }
  }
  ```

  The page text says to set `response_json_schema` "(or `responseFormat.text.schema` in REST)".
- JS SDK form: `responseMimeType: "application/json"` and `responseJsonSchema: <JSON Schema>`. The API reference's GenerationConfig (shown under the Live/bidi setup) still lists `responseMimeType` (values include `text/plain`, `application/json`, `text/x.enum`) and `responseJsonSchema`. `responseSchema` (the older OpenAPI-subset field) is not mentioned on the structured output page. [api-reference]
- Supported JSON Schema subset: types `string`, `number`, `integer`, `boolean`, `object`, `array`, `null` (nullable via a type array including `"null"`); `title`, `description`; object `properties`, `required`, `additionalProperties`; string `enum`, `format` (`date-time`, `date`, `time`); number/integer `enum`, `minimum`, `maximum`; array `items`, `prefixItems`, `minItems`, `maxItems`. Unsupported keywords are ignored (the Interactions page lists `minLength`, `maxLength`, `minProperties`, `maxProperties`, `uniqueItems`, `contains` family as stripped). Very large or deeply nested schemas can fail with 400 INVALID_ARGUMENT. [structured-output]
- Supported models include Gemini 3.8 Flash, 3.6 Flash, 3.5 Flash-Lite, 3.1 Flash-Lite, 2.5 Flash-Lite. [structured-output]

Thinking on generateContent: [thinking (generate-content=true)]

- `generationConfig.thinkingConfig` has `thinkingLevel`, `thinkingBudget`, `includeThoughts`.
- `thinkingLevel` is recommended for Gemini 3 and required for Gemini 4. Values `minimal`, `low`, `medium`, `high` (the API reference enum is uppercase `MINIMAL`...`HIGH`; public REST examples use lowercase).
- `thinkingBudget` is for Gemini 2.5 (`0` disables, `-1` dynamic). Gemini 2.5 models do not accept `thinkingLevel`. `thinkingBudget` is deprecated for Gemini 4.
- Levels per model: 3.5 and 3.1 Flash-Lite support `minimal` (default), `low`, `medium`, `high`. 3.6 Flash supports all four, default `medium`. 3.8 Flash rejects `minimal` with an error, default `medium`, lowest `low`.
- Flash-Lite models "do not support full thinking-off"; `minimal` does not guarantee zero thinking. Only 2.5 Flash-Lite can be fully off (`thinkingBudget: 0`, and that is its default).
- Gemini 4 and Gemini 3.6+ ignore `temperature`, `top_p`, `top_k`, return deprecation warning headers, and future releases will 400 on them. Do not send them. [troubleshooting]

### 4. Errors

Error body shape for generateContent (probe, invalid key, HTTP 400):

```json
{
  "error": {
    "code": 400,
    "message": "API key not valid. Please pass a valid API key.",
    "status": "INVALID_ARGUMENT",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "API_KEY_INVALID",
        "domain": "googleapis.com",
        "metadata": { "service": "generativelanguage.googleapis.com" }
      },
      {
        "@type": "type.googleapis.com/google.rpc.LocalizedMessage",
        "locale": "en-US",
        "message": "API key not valid. Please pass a valid API key."
      }
    ]
  }
}
```

- No key at all: 403 `PERMISSION_DENIED`, "Method doesn't allow unregistered callers..." (probe).
- 403 `PERMISSION_DENIED`: leaked or blocked key, restricted project, `FREE_TIER_VERIFICATION_REQUIRED`, payment needed. [troubleshooting]
- 429 `RESOURCE_EXHAUSTED` and 503 `UNAVAILABLE`: transient, retry with exponential backoff and jitter. 400 and 402: do not retry. [troubleshooting]
- The api-errors page (written for the Interactions API, error.code is a snake_case string there) splits 429 into `rate_limit_exceeded` (per minute or per second, back off), `quota_exceeded` (daily quota, wait for reset, retrying sooner will not help) and `too_many_requests` (burst). 503 `service_unavailable` is "temporarily overloaded or down". [api-errors]
- 429 detail shape on generateContent is NOT in official docs. A community report (gemini-cli issue #8437, Sep 14, 2025) shows: `error.code: 429`, `status: "RESOURCE_EXHAUSTED"`, message "You exceeded your current quota, please check your plan and billing details...", then `details` with a `google.rpc.QuotaFailure` whose `violations[]` each have `quotaMetric` (e.g. `generativelanguage.googleapis.com/generate_content_free_tier_requests`), `quotaId` (e.g. `GenerateRequestsPerMinutePerProjectPerModel-FreeTier`, `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, `GenerateContentInputTokensPerModelPerMinute-FreeTier`) and `quotaDimensions` (`location`, `model`); a `google.rpc.Help` link; and a `google.rpc.RetryInfo` with `retryDelay: "55s"`. Forum posts also report bare 429s with no details.
- Blocked content in a 200 response: `promptFeedback.blockReason` in `BLOCK_REASON_UNSPECIFIED`, `SAFETY`, `OTHER`, `BLOCKLIST`, `PROHIBITED_CONTENT`, `IMAGE_SAFETY` (prompt blocked, no candidates). `candidates[].finishReason` values include `STOP`, `MAX_TOKENS`, `SAFETY`, `RECITATION`, `LANGUAGE`, `OTHER`, `BLOCKLIST`, `PROHIBITED_CONTENT`, `SPII`, `MALFORMED_RESPONSE` and more. Text is at `candidates[0].content.parts[].text`; `usageMetadata` has `promptTokenCount`, `candidatesTokenCount`, `thoughtsTokenCount`, `totalTokenCount`. [api-reference]
- `BlockedReason.OTHER` means the request or response may break the terms or is otherwise unsupported. [troubleshooting]

### 5. Daily reset

"Requests per day (RPD) quotas reset at midnight Pacific time." [rate-limits]

### 6. Validating a key

- `GET https://generativelanguage.googleapis.com/v1beta/models` with `x-goog-api-key` returns 400 `API_KEY_INVALID` for a bad key (probe) and is a cheap format/validity check.
- Troubleshooting warns that `models.list` returning 200 does not prove inference is enabled for the project (for example free tier unavailable or verification pending). [troubleshooting]
- Whether `models.list` counts against generateContent quotas is not documented. The community quota ids above are all `generate_content_*` metrics, which suggests it does not, but this is unconfirmed.

### 7. Data usage

From the Gemini API Additional Terms (effective March 23, 2026): [terms]
- Unpaid Services: Google uses submitted content and generated responses to provide, improve and develop products and ML technology; human reviewers may read, annotate and process API input and output; do not submit sensitive, confidential or personal information.
- Paid Services (Cloud project with active billing): Google does not use prompts or responses to improve products; it logs them for a limited time for abuse detection and legal reasons.
- Pricing page row "Used to improve our products": Free tier "Yes", Paid tier "No", for all models above. [pricing]
- Users must be 18 or older, and the Services may not be part of an API client aimed at or likely to be used by under-18s.
- Apps offered to users in the EEA, Switzerland or UK may use only Paid Services; for users there, paid data terms also apply to unpaid use.

## Implementation Notes

Request (recommended form, primary):

```ts
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`,
  {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: "You grade Vietnamese to English translations..." }] },
      contents: [{ role: "user", parts: [{ text: promptWithSourceAndAnswer }] }],
      generationConfig: {
        responseFormat: {
          text: {
            mimeType: "APPLICATION_JSON",
            schema: {
              type: "object",
              properties: {
                correct: { type: "boolean" },
                explanationVi: { type: "string", description: "Short explanation in Vietnamese" },
              },
              required: ["correct", "explanationVi"],
              additionalProperties: false,
            },
          },
        },
        thinkingConfig: { thinkingLevel: "minimal" },
        maxOutputTokens: 512,
      },
    }),
    signal: AbortSignal.timeout(15000),
  },
);
```

- Fallback if the server rejects `responseFormat`: `generationConfig.responseMimeType: "application/json"` plus `responseJsonSchema: {...}`. Verify which one works with a real key before shipping (see Uncertainties).
- Parse `candidates[0].content.parts.filter(p => !p.thought).map(p => p.text).join("")` with `JSON.parse`, then validate the shape yourself (Zod or a hand check). The schema is a strong hint, not a contract you can skip validating.
- Classify errors from `res.status` plus `body.error.status` and `body.error.details`:
  - 400 + a detail with `reason === "API_KEY_INVALID"`: bad key, ask the learner to re-enter it.
  - 403 `PERMISSION_DENIED`: key leaked/blocked, project not eligible, or verification required; show the message and link to AI Studio.
  - 429: look for a `QuotaFailure` violation whose `quotaId` contains `PerDay` (daily cap, tell the learner it resets at midnight Pacific); otherwise treat as per-minute and honour `RetryInfo.retryDelay` (a string like `"55s"`) once, or back off with jitter.
  - 503 / 500 / 504: transient, one or two retries with backoff.
  - 200 with `promptFeedback.blockReason`, or `finishReason` other than `STOP` (`SAFETY`, `PROHIBITED_CONTENT`, `MAX_TOKENS`...): grading unavailable for this sentence; do not count it as wrong.
- Key validation on save: `GET /v1beta/models?pageSize=1` with the header. Treat 200 as "key format OK", not "grading will work"; the first real grade is the true test.

## Gotchas

- The docs site moved and the generateContent pages are now branded "Legacy" next to the Interactions API (`POST /v1beta/interactions`, header `Api-Revision: 2026-05-20`, `generation_config.thinking_level`, `response_format`). No deprecation date for generateContent was found. The Interactions error format (`error.code` as a snake_case string) differs from the generateContent google.rpc format seen in the probe.
- `gemini-3.8-flash` errors on `thinkingLevel: "minimal"`. Sending one config to every model breaks; keep the config per model.
- Do not send `temperature`/`topP`/`topK` to 3.6+ models; they are ignored today and slated to become 400 errors.
- Free tier limits are per project. Two keys from the same project share one quota, so "make a new key" does not help a learner who hit the cap.
- Free tier numbers are only visible in the learner's AI Studio dashboard, so the app cannot show "X requests left" from docs. Do not hardcode RPM/RPD.
- `gemini-2.5-flash-lite` is cheapest and can fully disable thinking, but new users cannot get it. Do not make it the default.
- Prices for 3.6/3.8 Flash double on Jan 1, 2027 (only matters for paid-tier learners).

## Integration Constraints

- Browser-only, no backend: the key lives in the learner's browser (localStorage or similar). Anyone with XSS or device access can read it. Keep strict CSP and never send the key to your own servers or analytics.
- Privacy notice must say: sentences and answers go straight from the browser to Google under the learner's own key; on the free tier Google may use them to improve products and humans may review them; do not type personal information.
- Age and region: Google requires 18+ users and paid-only service for EEA/Swiss/UK users. A free-tier BYOK feature for minors or EU learners conflicts with the terms. Flag in the spec; at minimum state it in the settings screen.
- Learn English runs on Cloudflare with a static/edge front end; nothing in this design needs a server route, and CORS allows the deployed origin.

## Recommendations

1. Default model `gemini-3.5-flash-lite`, `thinkingLevel: "minimal"`, `maxOutputTokens` around 512, 15 s timeout. Keep `gemini-3.1-flash-lite` as a configurable fallback (shutdown May 7, 2027). Put the model id in one constant so a rename is a one-line change.
2. Use v1beta generateContent with the `x-goog-api-key` header. Use plain fetch; no SDK needed.
3. Use the documented REST `responseFormat.text` form, with the `responseMimeType` + `responseJsonSchema` form as a tested fallback. Always validate the parsed JSON client side.
4. Map errors as in Implementation Notes; show the midnight Pacific reset in the learner's local time for daily-quota 429s.
5. Validate keys with `GET /v1beta/models`, but label it a light check.
6. Show a short consent/privacy line before the first grade, and cover the 18+ and EEA/UK points in the feature spec.

## Uncertainties

- Whether REST generateContent accepts both `responseFormat.text.{mimeType,schema}` and the older `responseMimeType`/`responseJsonSchema` pair. Docs show the first for REST and the second for the JS SDK; the API reference lists the second. Needs one live call with a real key.
- Exact free-tier RPM/RPD for any model: not published in docs as of 2026-11-09 (AI Studio dashboard only).
- 429 body details (`QuotaFailure.quotaId` naming with `PerDay`/`PerMinute`, `RetryInfo.retryDelay`): from a 2025 community report, not official docs; Google may also send bare 429s.
- Whether `models.list` consumes any quota: undocumented.
- Whether `thinkingLevel` values must be lowercase or uppercase on the public endpoint: lowercase in examples, uppercase in the reference enum. Lowercase is what the examples use.
- v1 (non-beta) support for `responseFormat`/`thinkingConfig`: not documented.
- Long-term status of generateContent versus the Interactions API: labelled Legacy, no shutdown date found.
- Probe results reflect 2026-11-09 server behaviour; CORS is not a documented guarantee.

## Sources

All fetched 2026-11-09. Pages showed no last-updated date unless noted.

- [models] https://aistudio.google.com/docs/models (redirect from ai.google.dev/gemini-api/docs/models)
- [deprecations] https://aistudio.google.com/docs/deprecations
- [rate-limits] https://aistudio.google.com/docs/rate-limits
- [pricing] https://aistudio.google.com/docs/pricing
- [api-key] https://aistudio.google.com/docs/api-key
- [troubleshooting] https://aistudio.google.com/docs/troubleshooting
- [api-errors] https://aistudio.google.com/docs/api-errors
- [structured-output] https://aistudio.google.com/docs/structured-output?generate-content=true (and the Interactions version without the query)
- [thinking] https://aistudio.google.com/docs/thinking?generate-content=true (and the Interactions version)
- [api-reference] https://aistudio.google.com/api-reference/generate-content (redirect from ai.google.dev/api/generate-content)
- [terms] https://aistudio.google.com/docs/terms (Gemini API Additional Terms, effective March 23, 2026)
- Community, not official: https://github.com/google-gemini/gemini-cli/issues/8437 (429 body, Sep 14, 2025)
- Probes: curl against generativelanguage.googleapis.com on 2026-11-09 (CORS preflight, invalid-key and no-key errors, `?key=` acceptance, v1 path).
