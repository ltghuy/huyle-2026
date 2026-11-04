"use client";

import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Brain, Headphones, PenLine, Shuffle, type LucideIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { contentQuery } from "@/content/queries";
import type { ArenaMode, ArenaSettings } from "@/learning/arena/protocol";
import { availableModes } from "@/learning/arena/questions";
import { LEVELS, type Level } from "@/learning/types";
import { cn } from "@/lib/utils";

// A room's settings form (feature 023): mode, level and rounds. Used to create a
// room (AC-002) and by the creator to change them before a match (AC-031).

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

/** "Hỗn hợp · A2 · 3 hiệp". */
export function settingsLine(settings: ArenaSettings): string {
  const mode = MODE_OPTIONS.find((option) => option.value === settings.mode)?.label ?? "";
  return `${mode} · ${settings.level} · ${settings.rounds === 1 ? "1 hiệp" : "3 hiệp"}`;
}

export function sameSettings(a: ArenaSettings, b: ArenaSettings): boolean {
  return a.mode === b.mode && a.level === b.level && a.rounds === b.rounds;
}

/** Modes the level can run, from the content this browser already caches; null while it loads. */
function useAvailableModes(level: Level): ArenaMode[] | null {
  const words = useQuery(contentQuery("word", level));
  const sentences = useQuery(contentQuery("sentence", level));
  if (!words.data || !sentences.data) return null;
  return availableModes({ words: words.data.items, sentences: sentences.data.items, wordings: new Map() });
}

export interface SettingsDraft {
  /** The settings to send, or null while the level's modes load or when it has none. */
  settings: ArenaSettings | null;
  /** The mode shown as chosen: the picked one, or the first the level can run. */
  mode: ArenaMode | null;
  level: Level;
  rounds: ArenaSettings["rounds"];
  available: ArenaMode[] | null;
  setMode: (mode: ArenaMode) => void;
  setLevel: (level: Level) => void;
  setRounds: (rounds: ArenaSettings["rounds"]) => void;
}

export function useSettingsDraft(initial: ArenaSettings): SettingsDraft {
  const [mode, setMode] = useState<ArenaMode>(initial.mode);
  const [level, setLevel] = useState<Level>(initial.level);
  const [rounds, setRounds] = useState<ArenaSettings["rounds"]>(initial.rounds);
  const available = useAvailableModes(level);
  // A mode the level can't run falls back to the first one it can (derived, not stored).
  const chosen = available && !available.includes(mode) ? (available[0] ?? null) : mode;
  const settings = chosen && available !== null && available.length > 0 ? { mode: chosen, level, rounds } : null;
  return { settings, mode: chosen, level, rounds, available, setMode, setLevel, setRounds };
}

interface SettingsFieldsProps {
  draft: SettingsDraft;
  /** Called after any change, e.g. to clear an error. */
  onChange?: () => void;
}

export function SettingsFields({ draft, onChange }: SettingsFieldsProps) {
  const modeLabel = useId();
  const levelLabel = useId();
  const roundsLabel = useId();
  const { available } = draft;

  function handleModeChange(value: ArenaMode) {
    draft.setMode(value);
    onChange?.();
  }

  function handleLevelChange(value: string[]) {
    if (value[0]) draft.setLevel(value[0] as Level);
    onChange?.();
  }

  function handleRoundsChange(value: string[]) {
    if (value[0]) draft.setRounds(Number(value[0]) as ArenaSettings["rounds"]);
    onChange?.();
  }

  return (
    <>
      <fieldset className="grid gap-2">
        <legend id={modeLabel} className="mb-2 text-sm font-medium">
          Chế độ
        </legend>
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
          {MODE_OPTIONS.map(({ value, label, hint, icon: Icon }) => {
            const disabled = available !== null && !available.includes(value);
            const selected = draft.mode === value;
            return (
              <label
                key={value}
                className={cn(
                  "flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border-2 p-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  selected && "border-primary bg-primary/10",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <input type="radio" name="arena-mode" value={value} checked={selected} disabled={disabled} onChange={() => handleModeChange(value)} className="sr-only" />
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
        <ToggleGroup aria-labelledby={levelLabel} variant="outline" spacing={0} value={[draft.level]} onValueChange={handleLevelChange} className="flex-wrap">
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
        <ToggleGroup aria-labelledby={roundsLabel} variant="outline" spacing={0} value={[String(draft.rounds)]} onValueChange={handleRoundsChange}>
          {ROUND_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} className="h-11 gap-1.5 px-4 aria-pressed:border-primary aria-pressed:bg-primary/15 aria-pressed:text-primary">
              {option.label}
              {"hint" in option ? <span className="text-xs text-muted-foreground">({option.hint})</span> : null}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {available !== null && available.length === 0 ? <p className="text-sm text-muted-foreground">{NO_MODES}</p> : null}
    </>
  );
}
