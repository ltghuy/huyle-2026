"use client";

import { useRef, useState } from "react";
import { Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isSoundEnabled } from "@/lib/answer-sound";
import { cn } from "@/lib/utils";

// Clips are static files on two audio-only Workers (free plan: 20,000 files
// each), one for words and one for sentences.
const AUDIO_BASE_URLS = {
  word: process.env.NEXT_PUBLIC_AUDIO_WORDS_URL ?? "https://audio-words.huyle.work",
  sentence: process.env.NEXT_PUBLIC_AUDIO_SENTENCES_URL ?? "https://audio-sentences.huyle.work",
} as const;

export type AudioSource = keyof typeof AUDIO_BASE_URLS;

export function audioUrl(source: AudioSource, key: string): string {
  return `${AUDIO_BASE_URLS[source]}/${key}.mp3`;
}

/**
 * Plays a clip once without a button (the word after a right answer). It stays
 * quiet when answer sounds are off or the clip can't play; returns a stop function.
 */
export function playClipOnce(source: AudioSource, key: string, delayMs = 0): () => void {
  if (!key || !isSoundEnabled()) return () => {};
  const audio = new Audio(audioUrl(source, key));
  const timer = window.setTimeout(() => void audio.play().catch(() => {}), delayMs);
  return () => {
    window.clearTimeout(timer);
    audio.pause();
  };
}

interface AudioButtonProps {
  /** Content hash of the clip; empty when audio hasn't been generated yet. */
  audioKey: string;
  /** Which audio host holds the clip. */
  source: AudioSource;
  /** What is being read, for the accessible name ("Nghe: homework"). */
  label: string;
  size?: "default" | "lg";
  className?: string;
  /** Called when the clip can't be loaded (the runner swaps listening for recall). */
  onError?: () => void;
}

/** Plays one clip in the app's single voice. */
export function AudioButton({ audioKey, source, label, size = "default", className, onError }: AudioButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePlay() {
    if (!audioKey) return;
    audioRef.current ??= new Audio(audioUrl(source, audioKey));
    const audio = audioRef.current;
    audio.currentTime = 0;
    setLoading(true);
    try {
      await audio.play();
    } catch {
      toast.error("Không phát được âm thanh. Bạn kiểm tra kết nối mạng nhé.");
      onError?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size === "lg" ? "icon-lg" : "icon"}
      className={cn(size === "lg" && "size-14 rounded-full [&_svg:not([class*='size-'])]:size-6", className)}
      onClick={handlePlay}
      disabled={!audioKey}
      aria-label={audioKey ? `Nghe: ${label}` : `Chưa có âm thanh cho: ${label}`}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Volume2 aria-hidden />}
    </Button>
  );
}
