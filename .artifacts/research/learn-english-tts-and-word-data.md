---
topic: learn-english-tts-and-word-data
researched_at: 2026-10-26
version: "n/a"
sources_hash: "n/a"
ttl_days: 90
keywords: [tts, text-to-speech, workers-ai, deepgram, aura-2, melotts, google-cloud-tts, chirp3-hd, neural2, azure-speech, r2, mp3, opus, cefr, oxford-3000, oxford-5000, cefr-j, octanove, english-vocabulary-profile, cmudict, arpabet, ipa, wiktionary, wiktextract, kaikki, dictionaryapi-dev, freedict, vietnamese, licensing]
---
# Learn English: TTS provider and word-data sources

> Researched: 2026-10-26

## Summary

- **TTS:** Cloudflare Workers AI `@cf/deepgram/aura-2-en` offers 15 American male voices, returns MP3 (48 kbps max) or Ogg/Opus, is billed at $0.030 per 1k input characters, and is called through the existing `AI` binding with no extra credentials. The initial batch (about 640k characters) costs about **$19.20** on Aura-2. Google Chirp 3 HD and Neural2, and Azure Neural, cost $0 to $19 for the same batch because of their free tiers. They add a second cloud account and credential flow, but they give SSML phoneme control that Aura does not.
- **Recommendation:** Aura-2, speaker `orpheus` (American, masculine). Store `mp3` at `bit_rate: 48000` (22.05 kHz mono). Audition `arcas` and `orion` before the batch run.
- **Word list:** Do **not** ship the Oxford 3000/5000. They are © Oxford University Press with no open licence, and GitHub mirrors that carry MIT or Apache labels cannot grant OUP's rights. Use the **CEFR-J Wordlist 1.5** (A1–B2, 7,799 rows, free for commercial use with citation) plus **Octanove C1** (1,111 rows, CC BY-SA 4.0).
- **IPA:** CMUdict (BSD-style licence) converted from ARPAbet to IPA with your own mapping, cross-checked against Wiktionary `General-American` IPA from Wiktextract (CC BY-SA). Avoid dictionaryapi.dev.
- **Vietnamese:** FreeDict has no English→Vietnamese dictionary. Wiktionary has Vietnamese translations, but they are sparse, noisy and CC BY-SA. Draft with AI, using POS and an example sentence as context, then have a human review.

## Key Information

### Part A: Text-to-speech

#### A1. Cloudflare Workers AI TTS catalog (2026-10)

| Model ID | Vendor | en-US male voices | Output | Price | Neurons |
|---|---|---|---|---|---|
| `@cf/deepgram/aura-2-en` | Deepgram | 15 American masculine (list below) | `mp3`, `opus` (ogg), `aac`, `flac`, `linear16`, `mulaw`, `alaw` | $0.030 / 1k chars | 2,727.27 / 1k chars |
| `@cf/deepgram/aura-1` | Deepgram | `orion`, `arcas`, `perseus`, `orpheus`, `zeus` (American); `angus` (Irish, **the default**); `helios` (British) | same encodings | $0.015 / 1k chars | 1,363.64 / 1k chars |
| `@cf/myshell-ai/melotts` | MyShell | No speaker parameter, only `lang` (default `en`) | MP3 (`audio/mpeg`) or JSON | $0.0002 / audio minute | 18.63 / audio minute |
| `@cf/deepgram/aura-2-es` | Deepgram | Spanish only | n/a | $0.030 / 1k chars | n/a |

- Workers AI general pricing: 10,000 free Neurons per day (resets 00:00 UTC), then **$0.011 per 1,000 Neurons** on Workers Paid. The 10k free Neurons cover only about 3.7k Aura-2 characters per day, so the free tier is negligible here.
- **Aura-2 American masculine speakers** (Deepgram docs): `apollo` (confident, casual), `arcas` (natural, smooth, clear), `aries` (warm, energetic), `atlas` (enthusiastic, ad-style), `hermes` (expressive, professional, informative), `jupiter` (expressive, baritone, informative), `mars` (smooth, patient, baritone), `neptune` (professional, patient, polite), `odysseus` (calm, smooth, professional), `orion` (approachable, calm, polite, "informative"), `orpheus` (professional, **clear**, confident, trustworthy), `pluto` (calm, empathetic, baritone), `saturn` (knowledgeable, baritone), `zeus` (deep, smooth). `draco` is British and `hyperion` is Australian, so exclude both. The Workers AI schema enum matches Deepgram's list, except that it omits `selene`.
- Aura-2 input schema (Workers AI): `text` (string, no maxLength in the schema), `speaker` (enum, default `luna`, which is **female**, so always pass a speaker), `encoding`, `container` (`none`/`wav`/`ogg`), `sample_rate`, `bit_rate`.
- Deepgram media settings:
  - **MP3:** sample rate fixed at 22,050 Hz; `bit_rate` must be 32000 or 48000 (default 48000); content type `audio/mpeg`.
  - **Opus:** fixed at 48,000 Hz; container `ogg` only; bit rate 4,000–650,000 bps (default 12,000); content type `audio/ogg;codecs=opus`.
- Deepgram limit: **2,000 characters per request**. Longer input returns 413. Too many concurrent requests return 429.
- Workers AI rate limits page lists no TTS-specific limit (see Uncertainties).
- Cloudflare's Workers AI privacy page treats model outputs as Customer Content that the customer owns. Third-party models may carry their own licence terms.

**Calling from a Worker (binding).** This follows the documented aura-1 example. Aura-2 adds `speaker`, `encoding` and `bit_rate`:

```ts
const res = await env.AI.run(
  "@cf/deepgram/aura-2-en",
  { text, speaker: "orpheus", encoding: "mp3", bit_rate: 48000 },
  { returnRawResponse: true },
); // Response whose body is the audio stream
await env.AUDIO.put(key, res.body, { httpMetadata: { contentType: "audio/mpeg" } });
```

**Calling from a Node script (REST):**

```
POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/deepgram/aura-2-en
Authorization: Bearer {API_TOKEN}       # token with Workers AI permission
Content-Type: application/json
{"text":"...","speaker":"orpheus","encoding":"mp3","bit_rate":48000}
```

The response body is the audio. Write it to a file or to R2 (via `wrangler r2 object put`, or the S3-compatible API).

#### A2. Google Cloud Text-to-Speech

| Voice family | en-US male voice IDs | Price / 1M chars | Monthly free tier |
|---|---|---|---|
| Chirp 3: HD | `en-US-Chirp3-HD-{Achird, Algenib, Algieba, Alnilam, Charon, Enceladus, Fenrir, Iapetus, Orus, Puck, Rasalgethi, Sadachbia, Sadaltager, Schedar, Umbriel, Zubenelgenubi}` | $30 | 0–1M chars |
| Chirp HD | `en-US-Chirp-HD-D` | n/a | n/a |
| Neural2 (now listed as "legacy") | `en-US-Neural2-A`, `-D`, `-I`, `-J` | $16 | 0–1M chars |
| Studio (legacy) | `en-US-Studio-Q` | $160 | 0–1M chars |
| Standard / WaveNet (legacy) | many | $4 | 0–4M chars |
| Instant custom voice | n/a | $60 | none |
| Gemini TTS (LLM, token-billed) | n/a | e.g. Gemini 3.8 Flash TTS preview: $0.50 / 1M text tokens + $9 / 1M audio tokens until 2026-12-31, doubling from 2027-01-01 | none |

- Chirp 3 HD:
  - Batch requests support MP3 and OGG_OPUS. Streaming does not support MP3.
  - `speaking_rate` ranges from 0.25 to 2.0.
  - SSML is Preview and synchronous only. Pause tags work only in the `markup` field.
- Endpoint: `POST https://texttospeech.googleapis.com/v1/text:synthesize` with JSON `{input:{text}, voice:{languageCode:"en-US", name}, audioConfig:{audioEncoding:"MP3"}}`. The response returns `audioContent` as **base64**, so you must decode it before writing to R2.
- **Auth:** the official docs describe ADC, gcloud credentials, service-account impersonation, attached service accounts, and workload identity federation.
  - **From a Worker:** no ADC is available. Build an RS256 JWT from a service-account key with WebCrypto `crypto.subtle.sign`, exchange it at `https://oauth2.googleapis.com/token` for a one-hour access token, and cache the token. The private key goes in a Worker secret.
  - **From a Node script:** `@google-cloud/text-to-speech` with ADC (`gcloud auth application-default login`) or `GOOGLE_APPLICATION_CREDENTIALS`.
  - API-key auth: see Uncertainties.

#### A3. Azure AI Speech

- en-US male neural voices include `en-US-AndrewNeural`, `BrianNeural`, `ChristopherNeural`, `GuyNeural`, `DavisNeural`, `EricNeural`, `JasonNeural`, `TonyNeural`, `RogerNeural`, `SteffanNeural`, `BrandonNeural`, `JacobNeural` and `KaiNeural`, plus `...MultilingualNeural` variants.
- HD variants include `en-US-Andrew:DragonHDLatestNeural` and `en-US-Brian:DragonHDLatestNeural`, and MAI-Voice-2 voices such as `en-US-Ethan:MAI-Voice-2`.
- Retail prices (Azure Retail Prices API, eastus, 2026-10):
  - Neural TTS: **$15 / 1M chars**.
  - Neural HD: **$22 / 1M**.
  - Free tier (F0): 0.5M neural chars per month.
- REST: `POST https://{region}.tts.speech.microsoft.com/cognitiveservices/v1`.
  - Headers: `Ocp-Apim-Subscription-Key: <key>` (or a Bearer token from `/sts/v1.0/issueToken`, valid 10 minutes), `Content-Type: application/ssml+xml`, `X-Microsoft-OutputFormat`, and `User-Agent` (required).
  - The body is SSML `<speak><voice name="en-US-AndrewNeural">…</voice></speak>`.
  - Output formats include `audio-24khz-48kbitrate-mono-mp3`, `audio-24khz-96kbitrate-mono-mp3`, `ogg-24khz-16bit-mono-opus` and `webm-24khz-16bit-24kbps-mono-opus`.
  - Maximum audio length per request is 10 minutes.
- Works from a Worker with only a static key header, so it is simpler than Google. It supports SSML `<phoneme alphabet="ipa">`.

#### A4. Cost estimate for the initial batch

Inputs: 5,000 words × 8 chars = 40,000 chars, plus 10,000 sentences × 60 chars = 600,000 chars, for **640,000 characters** in about 15,000 requests.

| Option | Batch cost | Notes |
|---|---|---|
| Workers AI Aura-2 | **$19.20** (≈1.75M Neurons) | One bill with the existing Cloudflare account |
| Workers AI Aura-1 | $9.60 (≈873k Neurons) | Older; only 5 American male voices |
| Workers AI MeloTTS | ≈$0.15 (assuming ≈750 audio minutes) | No voice selection; quality and gender unverified |
| Google Chirp 3 HD | $0 within the 1M free tier, otherwise $19.20 | Free tier is per billing account per month |
| Google Neural2 | $0 within the free tier, otherwise $10.24 | Legacy |
| Azure Neural (S1) | $9.60, or $0 to $2.10 counting the 0.5M/month free allowance | F0 has low concurrency |
| Azure Neural HD | $14.08 | n/a |

Ongoing on-demand cost: one 60-char sentence on Aura-2 costs about 164 Neurons (≈$0.0018). 1,000 new sentences per month cost about $1.80.

R2 storage at MP3 48 kbps (≈6 KB per word clip, ≈24 KB per 4-second sentence) is about 270 MB, well inside R2's free 10 GB.

### Part B: Word data

#### B1. Oxford 3000 / 5000

- Published by OUP on Oxford Learner's Dictionaries (`oxfordlearnersdictionaries.com/about/wordlists/oxford3000-5000`).
  - The Oxford 3000 covers A1–B2.
  - The Oxford 5000 adds about 2,000 B2–C1 words.
  - British and American versions exist, filterable by CEFR level, with PDF download via a "Download" button.
- The PDFs carry "© Oxford University Press". No open licence was found. The site returned 403 to automated fetches, so the terms page could not be read (see Uncertainties).
- Machine-readable copies exist, for example `ittuann/The-Oxford-5000-Word-Lists` (TXT/PDF, American variants, **Apache-2.0** label, no OUP disclaimer) and `StoneCypher/oxford_3000`. A repo licence covers only the uploader's own work and **does not license OUP's list**.
- **Licensing risk: HIGH.** Republishing the list, or its CEFR tags, in a public app means redistributing a copyrighted compilation without permission. Using it as a private cross-reference during curation carries less risk, but it is still not cleared.

#### B2. Openly usable CEFR lists

| Source | Levels / size | Columns | Licence |
|---|---|---|---|
| **CEFR-J Wordlist 1.5** (`openlanguageprofiles/olp-en-cefrj`, `cefrj-vocabulary-profile-1.5.csv`) | A1 1,164 · A2 1,411 · B1 2,446 · B2 2,778 (7,799 rows) | `headword,pos,CEFR,CoreInventory 1,CoreInventory 2,Threshold` | Free for research and commercial use **with proper citation**. © Tono Laboratory, TUFS. No warranty. |
| **Octanove Vocabulary Profile C1/C2 1.0** (same repo) | C1 1,111 · C2 1,025 | `headword,pos,CEFR,notes` | **CC BY-SA 4.0** (attribution plus share-alike on derived lists) |
| CEFR-J 1.6 (cefr-j.org) | n/a | n/a | Newer version reported by third parties. Terms not checked. |
| English Vocabulary Profile (Cambridge, englishprofile.org) | A1–C2, sense-level | n/a | Online lookup with registration. No download or open licence found. **Treat as not reusable.** |
| `Maximax67/Words-CEFR-Dataset` | Derived from CEFR-J plus Google n-grams | n/a | Labelled MIT by an aggregator, but CEFR-J's citation terms still apply upstream. |

Headwords are mixed. Some rows use slash variants such as `a.m./A.M./am/AM`, and the same headword appears with several POS, so normalise them.

#### B3. American IPA

- **CMU Pronouncing Dictionary** (`cmusphinx/cmudict`):
  - About 135k entries, still maintained (last push 2025-10).
  - BSD-style licence: keep the copyright notice and disclaimer in source and binary redistributions. Commercial use is allowed.
  - Uses 39-phoneme ARPAbet with stress digits on vowels (0 unstressed, 1 primary, 2 secondary).
  - Variants appear as `read` / `read(2)` with **no POS labels**. For example, `record R AH0 K AO1 R D` versus `record(2) R EH1 K ER0 D`.
- **ARPAbet→IPA mapping** (General American):
  - **Vowels:** AA ɑ, AE æ, AH0 ə, AH1/2 ʌ, AO ɔ, AW aʊ, AY aɪ, EH ɛ, ER0 ɚ, ER1/2 ɝ, EY eɪ, IH ɪ, IY i, OW oʊ, OY ɔɪ, UH ʊ, UW u.
  - **Consonants:** B b, CH tʃ, D d, DH ð, F f, G ɡ, HH h, JH dʒ, K k, L l, M m, N n, NG ŋ, P p, R ɹ (or r, by convention), S s, SH ʃ, T t, TH θ, V v, W w, Y j, Z z, ZH ʒ.
  - Primary stress `ˈ` and secondary stress `ˌ` go **before the stressed syllable's onset**, so you need a syllabifier (maximal-onset rule) because CMUdict has no syllable boundaries.
- **Wiktionary via Wiktextract / kaikki.org:**
  - Weekly JSONL dumps: English raw data is 2.9 GB gzipped, from the enwiktionary 2026-10-01 dump.
  - The `sounds[]` field holds `ipa` plus `tags`. For example, `abandon` gives `/əˈbæn.dən/` with tags including `General-American`.
  - Wiktextract code is MIT. Wiktionary text is **CC BY-SA 4.0 + GFDL**: attribute (a link to wiktionary.org suffices) and license derived material the same way.
- **dictionaryapi.dev (Free Dictionary API):**
  - The code repo is GPL-3.0, last pushed 2023-11, with 109 open issues.
  - The data source is not stated. The README example returns British IPA and `ssl.gstatic.com` audio, which suggests scraped Google data, so its licence is unclear.
  - The author put the rate limit at about 300 requests per 5 minutes in a 2020 issue.
  - Outage issues (500s) are on record, and the author has asked for donations to cover AWS costs.
  - **Not suitable as a data source.**

#### B4. Vietnamese meanings

- **FreeDict:** its database JSON (`freedict.org/freedict-database.json`) contains **no Vietnamese pair**.
- **English Wiktionary translations** (via Wiktextract `translations[]` with `code:"vi"`) are sense-scoped. For example, `abandon` (verb) gives `bỏ`, `từ bỏ`, `bỏ rơi`, but also the doubtful `bộm`, and the noun sense has none. Coverage is uneven and quality varies. Licence is CC BY-SA.
- **Vietnamese Wiktionary** has many English entries. Third-party sources say part of its content descends from Hồ Ngọc Đức's Free Vietnamese Dictionary Project, whose downstream packages cite GPL. Unverified; see Uncertainties.
- **AI drafting plus human review** avoids share-alike obligations, can be sense-matched to the CEFR-J POS and to your own example sentence, and can output learner-friendly glosses. It needs a review workflow and a "reviewed" flag per row.

## Implementation Notes

- **Batch TTS:**
  - Run the batch as a Node script against the Workers AI REST endpoint, not from a deployed Worker, to avoid Worker CPU and duration limits and to allow retries.
  - Throttle concurrency (start with 5–10 parallel requests) and back off on 429.
  - Use a content hash for the R2 key, e.g. `tts/v1/aura2-orpheus-mp3-48k/{sha1(normalizedText)}.mp3`, so identical text is never generated twice. Changing voice or format then means a new prefix instead of overwrites.
- **On-demand TTS:** a Worker route checks R2 by hash. On a miss it calls `env.AI.run(..., { returnRawResponse: true })` and tees the stream (`res.body.tee()`): one branch goes to `R2.put`, the other is returned to the client. Wrap the `put` in `ctx.waitUntil`.
- Set `Cache-Control: public, max-age=31536000, immutable` on R2-served audio, since keys are content-addressed.
- Keep sentences under 2,000 characters (Deepgram's limit). This is trivially true at about 60 chars.
- **Word list build:**
  1. CEFR-J A1–B2 (7,799 rows, deduplicated by lemma) plus Octanove C1 (1,111). Trim to about 5,000 by level quotas and frequency.
  2. Store `source` (`cefrj-1.5` / `octanove-1.0`) per row to drive attribution.
- **IPA build:**
  1. Join CMUdict by lowercase headword and convert ARPAbet to IPA.
  2. Where several CMU variants exist, pick by POS using Wiktionary's `General-American` IPA (matched by POS) as the tie-breaker.
  3. Flag disagreements for review.
- **Attribution page:** CEFR-J citation ("The CEFR-J Wordlist Version 1.5, compiled by Yukio Tono, TUFS"), Octanove CC BY-SA 4.0 notice, CMUdict copyright notice, and Wiktionary CC BY-SA link if any Wiktionary-derived field ships.

## Gotchas

- Aura-2's default speaker is `luna` (female) and Aura-1's is `angus` (Irish). **Always pass `speaker`.**
- Aura is "context-aware", so single isolated words may get odd prosody. It has **no SSML or phoneme control**, so heteronyms (`read`, `record`, `lead`, `live`, `object`, `present`) cannot be forced. Two mitigations:
  - Audition and manually flag heteronyms.
  - Generate those few words with Azure `<phoneme alphabet="ipa">` as a fallback, accepting the voice mismatch, or use the word only inside example sentences.
- MP3 from Aura is capped at 48 kbps and 22.05 kHz. That is fine for speech, but it is not hi-fi. Ogg/Opus gives better quality per byte, but Safari/iOS playback of Ogg Opus has historically been unreliable (unverified for current versions), so MP3 is the safe universal choice.
- Google returns base64 JSON, not raw audio, and needs JWT signing in Workers. Its free tier is per month, so spreading the batch across a month boundary may keep it at $0.
- Google lists Neural2, Studio and WaveNet as "legacy", so avoid building on them.
- Do not count on the Workers AI 10k free Neurons per day for anything meaningful with Aura.
- CMUdict has no syllable boundaries and no POS, and its AO/AA split reflects a speaker without the cot–caught merger. Flapping (`water` → [ˈwɑɾɚ]) is not marked. Present phonemic `/…/` transcriptions, not phonetic ones.
- CC BY-SA (Octanove, Wiktionary) is share-alike. Rows derived from those sources must be offered under CC BY-SA if redistributed. Keep them separable by `source` column, and do not mix them into a table you want to keep proprietary.
- A GitHub repo licence (MIT or Apache) on a copy of Oxford or EVP data **does not** license the underlying data.

## Integration Constraints

- Use the Workers AI binding (`env.AI`) in the OpenNext Worker via `getCloudflareContext().env.AI`. This needs `"ai": { "binding": "AI" }` in `wrangler.jsonc` and an R2 bucket binding for audio.
- The REST batch script needs a Cloudflare API token with Workers AI read and run permission plus R2 write access (S3 credentials or wrangler).
- Opus at 48 kHz in Ogg needs `audio/ogg` content type, and MP3 needs `audio/mpeg`. Set `httpMetadata.contentType` on `R2.put`.
- D1 should store, per word or sentence, the `audioKey` (the R2 key) and `ttsVoice`/`ttsModel` so you can regenerate selectively.

## Recommendations

1. **TTS:** `@cf/deepgram/aura-2-en`, `speaker: "orpheus"`, `encoding: "mp3"`, `bit_rate: 48000` (22.05 kHz mono, `audio/mpeg`).
   - Before the full run, generate about 50 samples (words plus sentences) for `orpheus`, `arcas` and `orion`, and pick by ear.
   - Batch cost is about $19 one-time, and on-demand cost is about $0.002 per sentence.
   - Keep Azure `en-US-AndrewNeural` (`audio-24khz-48kbitrate-mono-mp3`) as the fallback for heteronyms or if Aura quality disappoints.
2. **Word list:** CEFR-J 1.5 (A1–B2) plus Octanove C1, with citation and CC BY-SA attribution. Do not ship or derive CEFR tags from the Oxford 3000/5000 unless OUP grants written permission.
3. **IPA:** CMUdict converted to IPA with your own mapping, cross-checked against Wiktextract `General-American`. Do not use dictionaryapi.dev.
4. **Vietnamese:** AI-drafted, sense-matched glosses with a human review flag. Optionally show Wiktionary `vi` translations to the reviewer as hints only, not shipped, to avoid share-alike obligations.

## Uncertainties

- Workers AI rate limits for TTS models are not listed. Aura may fall under a default or a beta limit, so test with the batch script.
- Whether Workers AI bills Aura per request with a minimum character count, or strictly per character, is not stated.
- Deepgram's own licence terms for Aura output served via Workers AI were not found. Cloudflare's privacy page says outputs are Customer Content owned by the customer.
- Whether Workers AI passes through every Deepgram option (`bit_rate` values for mp3, `container`) exactly as Deepgram documents is inferred from the schema, not tested.
- `selene` is in Deepgram's Aura-2 list but missing from the Workers AI enum.
- MeloTTS voice gender, accent and quality on Workers AI were not documented.
- Google TTS **API-key** auth is reported by third parties to work with `?key=`, but it is not confirmed in the official auth page. Whether SSML tags count toward billed characters for Chirp 3 HD was not confirmed.
- The Google pricing page now lists WaveNet at $4 per 1M (same as Standard), which differs from historical pricing. Recheck before relying on it.
- Azure free-tier (F0) concurrency and limits were not checked.
- Oxford Learner's Dictionaries terms of use could not be fetched (HTTP 403). The licensing conclusion rests on the © OUP notice and the absence of any open licence.
- English Vocabulary Profile terms of use were not retrieved. The conclusion "not reusable" is based on registration-gated access and no published licence.
- CEFR-J 1.6's terms on cefr-j.org were not checked.
- The licence and provenance of Vietnamese Wiktionary's English entries (the FVDP-derived, possibly GPL, portion) are unverified.
- Current Safari/iOS support for Ogg Opus in `<audio>` is unverified.

## Sources

- Workers AI models catalog: https://developers.cloudflare.com/workers-ai/models/
- Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Workers AI limits: https://developers.cloudflare.com/workers-ai/platform/limits/
- Workers AI privacy / output ownership: https://developers.cloudflare.com/workers-ai/platform/privacy/
- aura-2-en model page and schema: https://developers.cloudflare.com/workers-ai/models/aura-2-en/ , https://developers.cloudflare.com/workers-ai/models/aura-2-en/schema-input.json
- aura-1 model page (binding and curl examples): https://developers.cloudflare.com/workers-ai/models/aura-1/
- melotts model page: https://developers.cloudflare.com/workers-ai/models/melotts/
- Deepgram TTS voices: https://developers.deepgram.com/docs/tts-models
- Deepgram media output settings: https://developers.deepgram.com/docs/tts-media-output-settings
- Deepgram TTS overview (2,000-char limit): https://developers.deepgram.com/docs/text-to-speech
- Google TTS pricing: https://cloud.google.com/text-to-speech/pricing
- Google TTS voices: https://cloud.google.com/text-to-speech/docs/list-voices-and-types
- Google Chirp 3 HD: https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd
- Google TTS authentication: https://docs.cloud.google.com/text-to-speech/docs/authentication
- Azure Speech pricing: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/ (figures from the Azure Retail Prices API, https://prices.azure.com/api/retail/prices)
- Azure TTS REST: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech
- Azure voice list: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts
- Oxford 3000/5000 (official): https://www.oxfordlearnersdictionaries.com/about/wordlists/oxford3000-5000
- Oxford list GitHub mirror: https://github.com/ittuann/The-Oxford-5000-Word-Lists
- CEFR-J / Octanove datasets: https://github.com/openlanguageprofiles/olp-en-cefrj
- English Profile: https://www.englishprofile.org/
- Words-CEFR-Dataset (aggregator listing): https://oosmetrics.com/repo/Maximax67/Words-CEFR-Dataset
- CMUdict: https://github.com/cmusphinx/cmudict (LICENSE)
- Wiktextract: https://github.com/tatuylonen/wiktextract
- kaikki.org raw data: https://kaikki.org/dictionary/rawdata.html
- Wiktionary copyrights: https://en.wiktionary.org/wiki/Wiktionary:Copyrights
- dictionaryapi.dev: https://dictionaryapi.dev/ , https://github.com/meetDeveloper/freeDictionaryAPI , rate-limit comment: https://github.com/meetDeveloper/freeDictionaryAPI/issues/73
- FreeDict database: https://freedict.org/downloads/ , https://freedict.org/freedict-database.json
