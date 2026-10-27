// Generates the app's audio: one American English male voice for every
// approved word and example sentence that has no clip yet. Each clip is stored
// in R2 under `<sha256(voice|text)>.mp3` (immutable, cached for a year) and its
// key is written back into the content source files. Run on the owner's
// machine only; the app never synthesises speech.
//
//   pnpm content:audio samples --provider google|aura      (a few clips per candidate voice, local only)
//   pnpm content:audio generate --provider google --voice en-US-Chirp3-HD-Charon [--level A1] [--no-upload] [--limit N]
//
// Credentials (shell environment, never committed):
//   google: GOOGLE_TTS_API_KEY (Cloud Text-to-Speech API enabled on the key's project)
//   aura:   CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (Workers AI permission)
// Uploading uses `wrangler r2 object put --remote` with the logged-in wrangler.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs, promisify } from "node:util";
import type { SourceItem } from "../src/content/schema";
import { LEVELS, type Level } from "../src/learning/types";

const run = promisify(execFile);
const BUCKET = "learn-english-audio";
const CACHE_CONTROL = "public, max-age=31536000, immutable";

export interface Provider {
  name: "google" | "aura";
  /** Turns text into MP3 bytes in `voice`. */
  synthesize(text: string, voice: string): Promise<Uint8Array>;
  sampleVoices: string[];
}

export function googleProvider(apiKey: string): Provider {
  return {
    name: "google",
    sampleVoices: ["en-US-Chirp3-HD-Charon", "en-US-Chirp3-HD-Puck", "en-US-Chirp3-HD-Fenrir", "en-US-Chirp3-HD-Orus"],
    async synthesize(text, voice) {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: { text }, voice: { languageCode: "en-US", name: voice }, audioConfig: { audioEncoding: "MP3" } }),
      });
      if (!response.ok) throw new Error(`Google TTS ${response.status}: ${(await response.text()).slice(0, 200)}`);
      const { audioContent } = (await response.json()) as { audioContent: string };
      return Uint8Array.from(Buffer.from(audioContent, "base64"));
    },
  };
}

export function auraProvider(accountId: string, token: string): Provider {
  return {
    name: "aura",
    sampleVoices: ["orpheus", "arcas", "orion", "apollo"],
    async synthesize(text, voice) {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/deepgram/aura-2-en`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        // Always pass the speaker: the model's default voice is female.
        body: JSON.stringify({ text, speaker: voice, encoding: "mp3", bit_rate: 48000 }),
      });
      if (!response.ok) throw new Error(`Workers AI ${response.status}: ${(await response.text()).slice(0, 200)}`);
      return new Uint8Array(await response.arrayBuffer());
    },
  };
}

/** Content-addressed clip key: changing the voice or the text gives a new key, never an overwrite. */
export function audioKey(voice: string, text: string): string {
  return createHash("sha256").update(`${voice}|${text.trim()}`).digest("hex");
}

export interface AudioJob {
  itemId: string;
  text: string;
  key: string;
}

/** Approved words and sentences whose clip is missing or was made with another voice. */
export function collectJobs(items: readonly SourceItem[], voice: string): AudioJob[] {
  const jobs: AudioJob[] = [];
  for (const item of items) {
    if (item.status !== "approved") continue;
    if (item.kind !== "word" && item.kind !== "sentence") continue;
    const text = item.kind === "word" ? item.body.headword : item.body.en;
    const key = audioKey(voice, text);
    if (item.body.audio !== key) jobs.push({ itemId: item.id, text, key });
  }
  return jobs;
}

/** Writes generated keys back into the items (only the `audio` field changes). */
export function applyKeys(items: SourceItem[], done: ReadonlyMap<string, string>): SourceItem[] {
  return items.map((item) => {
    const key = done.get(item.id);
    if (!key || (item.kind !== "word" && item.kind !== "sentence")) return item;
    return { ...item, body: { ...item.body, audio: key } } as SourceItem;
  });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  return existsSync(file) ? (JSON.parse(await readFile(file, "utf8")) as T) : fallback;
}

/** Runs `worker` over `inputs` with at most `limit` in flight. */
async function pool<T>(inputs: readonly T[], limit: number, worker: (input: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, inputs.length) }, async () => {
      while (next < inputs.length) await worker(inputs[next++]);
    }),
  );
}

function providerFromEnv(name: string | undefined): Provider {
  if (name === "google") {
    const key = process.env.GOOGLE_TTS_API_KEY;
    if (!key) throw new Error("Set GOOGLE_TTS_API_KEY");
    return googleProvider(key);
  }
  if (name === "aura") {
    const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } = process.env;
    if (!account || !token) throw new Error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN");
    return auraProvider(account, token);
  }
  throw new Error("--provider must be google or aura");
}

async function samples(provider: Provider, outDir: string) {
  await mkdir(outDir, { recursive: true });
  const lines = ["homework", "I do my homework after dinner.", "She has lived here for three years."];
  for (const voice of provider.sampleVoices) {
    for (const [i, text] of lines.entries()) {
      await writeFile(path.join(outDir, `${provider.name}-${voice}-${i + 1}.mp3`), await provider.synthesize(text, voice));
    }
    console.log(`Sample written for ${voice}`);
  }
  console.log(`Listen in ${outDir} and pick one voice for "generate".`);
}

async function generate(provider: Provider, voice: string, options: { level?: Level; upload: boolean; limit?: number }) {
  const root = process.cwd();
  const cacheDir = path.join(root, "content/.audio", voice);
  await mkdir(cacheDir, { recursive: true });
  const levels = options.level ? [options.level] : [...LEVELS];
  for (const kind of ["word", "sentence"] as const) {
    for (const level of levels) {
      const file = path.join(root, "content", kind, `${level}.json`);
      const items = await readJson<SourceItem[]>(file, []);
      let jobs = collectJobs(items, voice);
      if (options.limit) jobs = jobs.slice(0, options.limit);
      if (jobs.length === 0) continue;
      console.log(`${kind} ${level}: ${jobs.length} clips`);
      const done = new Map<string, string>();
      await pool(jobs, 4, async (job) => {
        const local = path.join(cacheDir, `${job.key}.mp3`);
        try {
          if (!existsSync(local)) await writeFile(local, await provider.synthesize(job.text, voice));
          if (options.upload) {
            await run("node_modules/.bin/wrangler", ["r2", "object", "put", `${BUCKET}/${job.key}.mp3`, "--file", local, "--content-type", "audio/mpeg", "--cache-control", CACHE_CONTROL, "--remote"]);
          }
          done.set(job.itemId, job.key);
        } catch (error) {
          console.error(`  ${job.itemId}: ${String(error).slice(0, 200)}`);
        }
      });
      // Keys are written only for clips that exist (and were uploaded, unless --no-upload).
      if (options.upload) await writeFile(file, JSON.stringify(applyKeys(items, done), null, 2) + "\n");
      console.log(`  ${done.size}/${jobs.length} done${options.upload ? ", keys saved" : " (local only, keys not saved)"}`);
    }
  }
  const cached = (await readdir(cacheDir)).length;
  console.log(`Local cache: ${cached} clips in ${path.relative(root, cacheDir)}`);
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      provider: { type: "string" },
      voice: { type: "string" },
      level: { type: "string" },
      limit: { type: "string" },
      "no-upload": { type: "boolean", default: false },
    },
  });
  const provider = providerFromEnv(values.provider);
  if (positionals[0] === "samples") return samples(provider, path.join(process.cwd(), "content/.audio/samples"));
  if (positionals[0] === "generate") {
    if (!values.voice) throw new Error("--voice is required");
    const level = values.level as Level | undefined;
    if (level && !LEVELS.includes(level)) throw new Error(`--level must be one of ${LEVELS.join(", ")}`);
    return generate(provider, values.voice, { level, upload: !values["no-upload"], limit: values.limit ? Number(values.limit) : undefined });
  }
  console.log("Usage: content:audio samples --provider google|aura | generate --provider … --voice … [--level A1] [--no-upload] [--limit N]");
}

if (process.argv[1]?.endsWith("generate-audio.ts")) void main();
