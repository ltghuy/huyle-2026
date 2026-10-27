// Short tones played when an answer is checked. They are synthesised with Web
// Audio, so there are no files to fetch, and they always start inside the tap
// that checked the answer (browsers block audio that doesn't). The on/off
// choice is per device, kept in localStorage; it falls back to memory when
// storage is blocked.

const SOUND_KEY = "learn-english:sound";

type Tone = { frequency: number; start: number; duration: number };

const CORRECT_TONES: Tone[] = [
  { frequency: 659.25, start: 0, duration: 0.12 }, // E5
  { frequency: 987.77, start: 0.09, duration: 0.22 }, // B5
];
const WRONG_TONES: Tone[] = [
  { frequency: 233.08, start: 0, duration: 0.14 }, // A#3
  { frequency: 196, start: 0.12, duration: 0.24 }, // G3
];

let context: AudioContext | null = null;
let memoryEnabled = true;
const listeners = new Set<() => void>();

export function isSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(SOUND_KEY);
    return stored === null ? memoryEnabled : stored !== "off";
  } catch {
    return memoryEnabled;
  }
}

export function setSoundEnabled(enabled: boolean) {
  memoryEnabled = enabled;
  try {
    localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  } catch {
    // Blocked storage: the choice lasts until the tab closes.
  }
  for (const listener of listeners) listener();
}

/** For `useSyncExternalStore`. */
export function subscribeSound(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function playAnswerSound(correct: boolean) {
  if (!isSoundEnabled() || typeof AudioContext === "undefined") return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    for (const tone of correct ? CORRECT_TONES : WRONG_TONES) playTone(context, tone, now, correct ? "sine" : "triangle");
  } catch {
    // No sound is better than a broken check.
  }
}

function playTone(ctx: AudioContext, tone: Tone, now: number, type: OscillatorType) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = now + tone.start;
  const end = start + tone.duration;
  oscillator.type = type;
  oscillator.frequency.value = tone.frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.18, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}
