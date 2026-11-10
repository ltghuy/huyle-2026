"use client";

import { useQuery } from "@tanstack/react-query";
import { useId, useState, type ReactNode } from "react";
import { Brain, Headphones, PenLine, Shuffle, type LucideIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { contentQuery } from "@/content/queries";
import { QUESTION_TIMES, type ArenaMode, type ArenaSettings, type MatchSettings, type QuestionTime } from "@/learning/arena/protocol";
import { availableModes } from "@/learning/arena/questions";
import { LEVELS, type Level } from "@/learning/types";
import { cn } from "@/lib/utils";

// A room's settings form (feature 023): mode, level, rounds and, since 028, the time per question. Used to create a
// room (AC-002) and by the creator to change them before a match (AC-031).

export const MODE_OPTIONS: readonly { value: ArenaMode; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "mixed", label: "Hỗn hợp", hint: "Cả ba dạng, xen kẽ nhau", icon: Shuffle },
  { value: "listen", label: "Nghe", hint: "Nghe và chọn từ", icon: Headphones },
  { value: "recall", label: "Nhớ từ", hint: "Xem nghĩa, gõ từ", icon: Brain },
  { value: "write", label: "Viết câu", hint: "Dịch câu sang tiếng Anh", icon: PenLine },
];

const ROUND_OPTIONS = [
  { value: "1", label: "1 hiệp" },
  { value: "3", label: "3 hiệp", hint: "thắng 2" },
] as const;

const NO_MODES = "Trình độ này chưa đủ câu hỏi cho Đấu trường. Bạn chọn trình độ khác nhé.";

/** "Hỗn hợp · A2 · 3 hiệp · 15 giây/câu"; a past match has no question time (028). */
export function settingsLine(settings: ArenaSettings | MatchSettings): string {
  const mode = MODE_OPTIONS.find((option) => option.value === settings.mode)?.label ?? "";
  const line = `${mode} · ${settings.level} · ${settings.rounds === 1 ? "1 hiệp" : "3 hiệp"}`;
  return "seconds" in settings ? `${line} · ${settings.seconds} giây/câu` : line;
}

export function sameSettings(a: ArenaSettings, b: ArenaSettings): boolean {
  return a.mode === b.mode && a.level === b.level && a.rounds === b.rounds && a.seconds === b.seconds;
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
  seconds: QuestionTime;
  available: ArenaMode[] | null;
  setMode: (mode: ArenaMode) => void;
  setLevel: (level: Level) => void;
  setRounds: (rounds: ArenaSettings["rounds"]) => void;
  setSeconds: (seconds: QuestionTime) => void;
}

export function useSettingsDraft(initial: ArenaSettings): SettingsDraft {
  const [mode, setMode] = useState<ArenaMode>(initial.mode);
  const [level, setLevel] = useState<Level>(initial.level);
  const [rounds, setRounds] = useState<ArenaSettings["rounds"]>(initial.rounds);
  const [seconds, setSeconds] = useState<QuestionTime>(initial.seconds);
  const available = useAvailableModes(level);
  // A mode the level can't run falls back to the first one it can (derived, not stored).
  const chosen = available && !available.includes(mode) ? (available[0] ?? null) : mode;
  const settings = chosen && available !== null && available.length > 0 ? { mode: chosen, level, rounds, seconds } : null;
  return { settings, mode: chosen, level, rounds, seconds, available, setMode, setLevel, setRounds, setSeconds };
}

interface SettingsFieldsProps {
  draft: SettingsDraft;
  /** Called after any change, e.g. to clear an error. */
  onChange?: () => void;
  /** More timing fields shown first on the rounds and time row (team rooms add the round length, feature 039). */
  timing?: ReactNode;
}

export function SettingsFields({ draft, onChange, timing }: SettingsFieldsProps) {
  const modeLabel = useId();
  const levelLabel = useId();
  const secondsLabel = useId();
  const { available } = draft;

  function handleModeChange(value: ArenaMode) {
    draft.setMode(value);
    onChange?.();
  }

  function handleLevelChange(value: string[]) {
    if (value[0]) draft.setLevel(value[0] as Level);
    onChange?.();
  }

  function handleRoundsChange(value: string) {
    draft.setRounds(Number(value) as ArenaSettings["rounds"]);
    onChange?.();
  }

  function handleSecondsChange(value: string[]) {
    if (value[0]) draft.setSeconds(Number(value[0]) as QuestionTime);
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

      {/* Rounds and time share a row, and wrap onto two on a narrow screen. */}
      <div className="flex flex-wrap gap-x-10 gap-y-6">
        {timing}
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Số hiệp</legend>
          <div className="flex h-11 items-center gap-5">
            {ROUND_OPTIONS.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-md has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
                <input
                  type="radio"
                  name="arena-rounds"
                  value={option.value}
                  checked={String(draft.rounds) === option.value}
                  onChange={() => handleRoundsChange(option.value)}
                  className="size-5 cursor-pointer accent-primary"
                />
                <span className="font-medium">{option.label}</span>
                {"hint" in option ? <span className="text-xs text-muted-foreground">({option.hint})</span> : null}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-2">
          <span id={secondsLabel} className="text-sm font-medium">
            Thời gian mỗi câu
          </span>
          <ToggleGroup aria-labelledby={secondsLabel} variant="outline" spacing={0} value={[String(draft.seconds)]} onValueChange={handleSecondsChange} className="flex-wrap">
            {QUESTION_TIMES.map((value) => (
              <ToggleGroupItem key={value} value={String(value)} aria-label={`${value} giây`} className="h-11 min-w-14 px-3 font-semibold tabular-nums aria-pressed:border-primary aria-pressed:bg-primary/15 aria-pressed:text-primary">
                {value}s
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {available !== null && available.length === 0 ? <p className="text-sm text-muted-foreground">{NO_MODES}</p> : null}
    </>
  );
}
