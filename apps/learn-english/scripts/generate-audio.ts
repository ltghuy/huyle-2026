// Generates the app's audio: one American English male voice for every
// approved word and example sentence that has no clip yet. Clips are named
// `<sha256(voice|text)>.mp3`, cached in content/.audio/<voice>/ (not in git),
// and their keys are written back into the content source files. `deploy`
// then serves them as static files from two audio-only Workers (words and
// sentences; free plan: 20,000 files each, unlimited free requests). Run on
// the owner's machine only; the app never synthesises speech.
//
//   pnpm content:audio samples --provider kokoro|google|aura   (a few clips per candidate voice)
//   pnpm content:audio generate --provider kokoro --voice am_michael [--level A1] [--limit N]
//   pnpm content:audio deploy                                  (after generate, before content:publish)
//
// kokoro is free: the open Kokoro-82M model (Apache-2.0) runs on this machine
// through kokoro-js; the model downloads from Hugging Face on first use, and
// clips are encoded to MP3 here. The other providers are paid cloud services
// and need credentials in the shell environment (never committed):
//   google: GOOGLE_TTS_API_KEY (Cloud Text-to-Speech API enabled on the key's project)
//   aura:   CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (Workers AI permission)
// Deploying uses the logged-in wrangler.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs, promisify } from "node:util";
import type { SourceItem } from "../src/content/schema";
import { LEVELS, type Level } from "../src/learning/types";

const run = promisify(execFile);
const FREE_PLAN_FILE_LIMIT = 20_000;
// Clip names are content hashes, so a clip never changes: cache for a year.
const HEADERS_FILE = "/*\n  Cache-Control: public, max-age=31536000, immutable\n";

export interface Provider {
  name: "kokoro" | "google" | "aura";
  /** Turns text into MP3 bytes in `voice`. */
  synthesize(text: string, voice: string): Promise<Uint8Array>;
  sampleVoices: string[];
  /** Clips generated at once (a local model is CPU-bound: one at a time). */
  concurrency: number;
}

/** Encodes mono float samples (-1..1) as a 64 kbps MP3. */
export async function encodeMp3(samples: Float32Array, sampleRate: number): Promise<Uint8Array> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const pcm = Int16Array.from(samples, (sample) => Math.max(-32768, Math.min(32767, Math.round(sample * 32767))));
  const encoder = new Mp3Encoder(1, sampleRate, 64);
  // lamejs returns Int8Array frames at runtime (its types say Uint8Array); Buffer.concat only takes Uint8Array.
  const bytes = (frame: ArrayBufferView) => new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < pcm.length; i += 1152) chunks.push(bytes(encoder.encodeBuffer(pcm.subarray(i, i + 1152))));
  chunks.push(bytes(encoder.flush()));
  return new Uint8Array(Buffer.concat(chunks));
}

export function kokoroProvider(): Provider {
  type Model = { generate(text: string, options: { voice: string }): Promise<{ audio: Float32Array; sampling_rate: number }> };
  let model: Promise<Model> | undefined;
  const load = async (): Promise<Model> => {
    const { KokoroTTS } = await import("kokoro-js");
    return (await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" })) as unknown as Model;
  };
  return {
    name: "kokoro",
    // The American male voices with the best grades on the model card.
    sampleVoices: ["am_michael", "am_fenrir", "am_puck", "am_adam"],
    concurrency: 1,
    async synthesize(text, voice) {
      model ??= load();
      const { audio, sampling_rate } = await (await model).generate(text, { voice });
      return encodeMp3(audio, sampling_rate);
    },
  };
}

export function googleProvider(apiKey: string): Provider {
  return {
    name: "google",
    concurrency: 4,
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
    concurrency: 4,
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
  if (name === "kokoro") return kokoroProvider();
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
  throw new Error("--provider must be kokoro, google or aura");
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

async function generate(provider: Provider, voice: string, options: { level?: Level; limit?: number }) {
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
      await pool(jobs, provider.concurrency, async (job) => {
        const local = path.join(cacheDir, `${job.key}.mp3`);
        try {
          if (!existsSync(local)) await writeFile(local, await provider.synthesize(job.text, voice));
          done.set(job.itemId, job.key);
        } catch (error) {
          console.error(`  ${job.itemId}: ${String(error).slice(0, 200)}`);
        }
      });
      // Keys are written only for clips that now exist in the cache.
      await writeFile(file, JSON.stringify(applyKeys(items, done), null, 2) + "\n");
      console.log(`  ${done.size}/${jobs.length} done, keys saved`);
    }
  }
  const cached = (await readdir(cacheDir)).length;
  console.log(`Local cache: ${cached} clips in ${path.relative(root, cacheDir)}. Next: pnpm content:audio deploy`);
}

/** Clip keys the approved content refers to, split by audio host. */
export function referencedKeys(items: readonly SourceItem[]): { words: Set<string>; sentences: Set<string> } {
  const words = new Set<string>();
  const sentences = new Set<string>();
  for (const item of items) {
    if (item.status !== "approved") continue;
    if (item.kind === "word" && item.body.audio) words.add(item.body.audio);
    if (item.kind === "sentence" && item.body.audio) sentences.add(item.body.audio);
  }
  return { words, sentences };
}

/**
 * Assembles the two static folders from the clip cache (only clips the content
 * uses) and deploys the audio Workers. Fails before deploying if a clip is
 * missing or a folder would pass the free plan's file limit.
 */
async function deploy() {
  const root = process.cwd();
  const cacheRoot = path.join(root, "content/.audio");
  const items: SourceItem[] = [];
  for (const kind of ["word", "sentence"] as const) {
    for (const level of LEVELS) items.push(...(await readJson<SourceItem[]>(path.join(root, "content", kind, `${level}.json`), [])));
  }
  const voices = (await readdir(cacheRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory() && !["dist", "samples"].includes(entry.name));
  const findClip = (key: string) => voices.map((voice) => path.join(cacheRoot, voice.name, `${key}.mp3`)).find((file) => existsSync(file));

  const { words, sentences } = referencedKeys(items);
  for (const [name, keys] of [["words", words], ["sentences", sentences]] as const) {
    if (keys.size + 1 > FREE_PLAN_FILE_LIMIT) throw new Error(`${name}: ${keys.size} clips is over the free plan's ${FREE_PLAN_FILE_LIMIT} files per Worker`);
    const missing = [...keys].filter((key) => !findClip(key));
    if (missing.length) throw new Error(`${name}: ${missing.length} clips missing from the cache (run generate first), e.g. ${missing[0]}`);
    const dir = path.join(cacheRoot, "dist", name);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    for (const key of keys) await copyFile(findClip(key)!, path.join(dir, `${key}.mp3`));
    await writeFile(path.join(dir, "_headers"), HEADERS_FILE);
    console.log(`${name}: ${keys.size} clips → deploying`);
    const { stdout } = await run("node_modules/.bin/wrangler", ["deploy", "-c", `audio/${name}.wrangler.jsonc`], { maxBuffer: 64 * 1024 * 1024 });
    console.log(stdout.split("\n").filter((line) => /Uploaded|Deployed|https?:\/\//.test(line)).join("\n"));
  }
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      provider: { type: "string" },
      voice: { type: "string" },
      level: { type: "string" },
      limit: { type: "string" },
    },
  });
  if (positionals[0] === "deploy") return deploy();
  const provider = providerFromEnv(values.provider);
  if (positionals[0] === "samples") return samples(provider, path.join(process.cwd(), "content/.audio/samples"));
  if (positionals[0] === "generate") {
    if (!values.voice) throw new Error("--voice is required");
    const level = values.level as Level | undefined;
    if (level && !LEVELS.includes(level)) throw new Error(`--level must be one of ${LEVELS.join(", ")}`);
    return generate(provider, values.voice, { level, limit: values.limit ? Number(values.limit) : undefined });
  }
  console.log("Usage: content:audio samples --provider kokoro|google|aura | generate --provider … --voice … [--level A1] [--limit N] | deploy");
}

if (process.argv[1]?.endsWith("generate-audio.ts")) void main();
