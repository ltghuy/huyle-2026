"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Brain, Headphones, PenLine, Shuffle, Swords, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { contentQuery } from "@/content/queries";
import type { ArenaMode, ArenaSettings } from "@/learning/arena/protocol";
import { availableModes } from "@/learning/arena/questions";
import { LEVELS, type Level } from "@/learning/types";
import { ArenaError, createRoom } from "@/lib/arena-client";
import { cn } from "@/lib/utils";
import { roomPath } from "./join-room";

export const MODE_OPTIONS: readonly { value: ArenaMode; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "mixed", label: "Hỗn hợp", hint: "Cả ba dạng, xen kẽ nhau", icon: Shuffle },
  { value: "listen", label: "Nghe", hint: "Nghe và chọn từ · 15 giây", icon: Headphones },
  { value: "recall", label: "Nhớ từ", hint: "Xem nghĩa, gõ từ · 15 giây", icon: Brain },
  { value: "write", label: "Viết câu", hint: "Dịch câu sang tiếng Anh · 30 giây", icon: PenLine },
];

const ROUND_OPTIONS = [
  { value: "1", label: "1 hiệp" },
  { value: "3", label: "3 hiệp", hint: "thắng 2" },
] as const;

const NO_MODES = "Trình độ này chưa đủ câu hỏi cho Đấu trường. Bạn chọn trình độ khác nhé.";

/** Modes the level can run, from the content this browser already caches; null while it loads. */
function useAvailableModes(level: Level): ArenaMode[] | null {
  const words = useQuery(contentQuery("word", level));
  const sentences = useQuery(contentQuery("sentence", level));
  if (!words.data || !sentences.data) return null;
  return availableModes({ words: words.data.items, sentences: sentences.data.items, wordings: new Map() });
}

interface CreateRoomProps {
  /** The learner's level, chosen first. */
  defaultLevel: Level;
  /** The learner's chosen name, shown to the opponent. */
  name?: string;
}

/** "Tạo phòng": mode, level and rounds, then the room (AC-002). */
export function CreateRoom({ defaultLevel, name }: CreateRoomProps) {
  const router = useRouter();
  const modeLabel = useId();
  const levelLabel = useId();
  const roundsLabel = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ArenaMode>("mixed");
  const [level, setLevel] = useState<Level>(defaultLevel);
  const [rounds, setRounds] = useState<ArenaSettings["rounds"]>(3);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const available = useAvailableModes(level);
  // A mode the level can't run falls back to the first one it can (derived, not stored).
  const chosen = available && !available.includes(mode) ? (available[0] ?? null) : mode;
  const canCreate = Boolean(chosen) && available !== null && available.length > 0 && !creating;

  function handleLevelChange(value: string[]) {
    if (value[0]) setLevel(value[0] as Level);
    setError(null);
  }

  function handleRoundsChange(value: string[]) {
    if (value[0]) setRounds(Number(value[0]) as ArenaSettings["rounds"]);
  }

  async function handleCreate() {
    if (!chosen || !canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const room = await createRoom({ mode: chosen, level, rounds }, name);
      router.push(roomPath(room.code));
    } catch (cause) {
      setError(cause instanceof ArenaError ? cause.message : "Không tạo được phòng. Bạn thử lại nhé.");
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" className="h-12 w-full gap-2 text-base sm:w-fit" />}>
        <Swords aria-hidden /> Tạo phòng
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo phòng đấu</DialogTitle>
          <DialogDescription>Bạn chọn cách chơi, rồi gửi mã phòng cho bạn bè.</DialogDescription>
        </DialogHeader>

        <fieldset className="grid gap-2">
          <legend id={modeLabel} className="mb-2 text-sm font-medium">
            Chế độ
          </legend>
          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            {MODE_OPTIONS.map(({ value, label, hint, icon: Icon }) => {
              const disabled = available !== null && !available.includes(value);
              const selected = chosen === value;
              return (
                <label
                  key={value}
                  className={cn(
                    "flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border-2 p-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                    selected && "border-primary bg-primary/10",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <input type="radio" name="arena-mode" value={value} checked={selected} disabled={disabled} onChange={() => setMode(value)} className="sr-only" />
                  <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
                  <span className="grid gap-0.5">
                    <span className="font-semibold">{label}</span>
                    <span className="text-xs text-muted-foreground">{disabled ? "Chưa đủ câu ở trình độ này" : hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-2">
          <span id={levelLabel} className="text-sm font-medium">
            Trình độ
          </span>
          <ToggleGroup aria-labelledby={levelLabel} variant="outline" spacing={0} value={[level]} onValueChange={handleLevelChange} className="flex-wrap">
            {LEVELS.map((value) => (
              <ToggleGroupItem key={value} value={value} className="h-11 min-w-12 px-3 font-semibold aria-pressed:border-primary aria-pressed:bg-primary/15 aria-pressed:text-primary">
                {value}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="grid gap-2">
          <span id={roundsLabel} className="text-sm font-medium">
            Số hiệp
          </span>
          <ToggleGroup aria-labelledby={roundsLabel} variant="outline" spacing={0} value={[String(rounds)]} onValueChange={handleRoundsChange}>
            {ROUND_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} className="h-11 gap-1.5 px-4 aria-pressed:border-primary aria-pressed:bg-primary/15 aria-pressed:text-primary">
                {option.label}
                {"hint" in option ? <span className="text-xs text-muted-foreground">({option.hint})</span> : null}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {available !== null && available.length === 0 ? <p className="text-sm text-muted-foreground">{NO_MODES}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button size="lg" className="h-11 w-full gap-2 sm:w-auto" disabled={!canCreate} onClick={handleCreate}>
            <Swords aria-hidden />
            {creating ? "Đang tạo phòng…" : available === null ? "Đang tải câu hỏi…" : "Tạo phòng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
