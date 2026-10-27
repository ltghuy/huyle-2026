"use client";

import { useRef, useState } from "react";
import { Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AUDIO_BASE_URL = process.env.NEXT_PUBLIC_AUDIO_BASE_URL ?? "https://audio.english.huyle.work";

export function audioUrl(key: string): string {
  return `${AUDIO_BASE_URL}/${key}.mp3`;
}

interface AudioButtonProps {
  /** Content hash of the clip; empty when audio hasn't been generated yet. */
  audioKey: string;
  /** What is being read, for the accessible name ("Nghe: homework"). */
  label: string;
  size?: "default" | "lg";
  className?: string;
  /** Called when the clip can't be loaded (the runner swaps listening for recall). */
  onError?: () => void;
}

/** Plays one clip in the app's single voice. */
export function AudioButton({ audioKey, label, size = "default", className, onError }: AudioButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePlay() {
    if (!audioKey) return;
    audioRef.current ??= new Audio(audioUrl(audioKey));
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
