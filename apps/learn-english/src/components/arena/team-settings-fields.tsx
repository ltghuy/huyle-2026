"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_TEAM_SIZE, MIN_TEAM_SIZE, ROUND_MINUTES, type RoundMinutes, type TeamSettings } from "@/learning/arena/team-protocol";
import { MODE_OPTIONS, SettingsFields, useSettingsDraft, type SettingsDraft } from "./settings-fields";

// A team room's settings form ("Đấu đội", feature 039): the room size and the round length on top of the duel's
// mode, level, rounds and time per question (AC-002). Used to create a room and by the host in the lobby (AC-049).

/** "Hỗn hợp · A2 · 10 phút/hiệp · 15 giây/câu · 3 hiệp" (AC-007). */
export function teamSettingsLine(settings: TeamSettings): string {
  const mode = MODE_OPTIONS.find((option) => option.value === settings.mode)?.label ?? "";
  return `${mode} · ${settings.level} · ${settings.minutes} phút/hiệp · ${settings.seconds} giây/câu · ${settings.rounds === 1 ? "1 hiệp" : "3 hiệp"}`;
}

export function sameTeamSettings(a: TeamSettings, b: TeamSettings): boolean {
  return a.mode === b.mode && a.level === b.level && a.rounds === b.rounds && a.seconds === b.seconds && a.size === b.size && a.minutes === b.minutes;
}

export interface TeamSettingsDraft extends SettingsDraft {
  /** The settings to send, or null while the level's modes load or when it has none. */
  settings: TeamSettings | null;
  size: number;
  minutes: RoundMinutes;
  setSize: (size: number) => void;
  setMinutes: (minutes: RoundMinutes) => void;
}

export function useTeamSettingsDraft(initial: TeamSettings): TeamSettingsDraft {
  const base = useSettingsDraft(initial);
  const [size, setSize] = useState(initial.size);
  const [minutes, setMinutes] = useState<RoundMinutes>(initial.minutes);
  const settings = base.settings ? { ...base.settings, size, minutes } : null;
  return { ...base, settings, size, minutes, setSize, setMinutes };
}

interface TeamSettingsFieldsProps {
  draft: TeamSettingsDraft;
  /** Called after any change, e.g. to clear an error. */
  onChange?: () => void;
  /** The smallest size allowed, e.g. the players already in the lobby (AC-050). */
  minSize?: number;
}

function SizeStepper({ draft, onChange, minSize = MIN_TEAM_SIZE }: TeamSettingsFieldsProps) {
  const label = useId();
  const min = Math.max(MIN_TEAM_SIZE, minSize);

  function handleStep(step: number) {
    draft.setSize(Math.min(MAX_TEAM_SIZE, Math.max(min, draft.size + step)));
    onChange?.();
  }

  return (
    <div role="group" aria-labelledby={label} className="grid gap-2">
      <span id={label} className="text-sm font-medium">
        Số người
      </span>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="icon-lg" className="size-11" aria-label="Bớt một người" disabled={draft.size <= min} onClick={() => handleStep(-1)}>
          <Minus aria-hidden />
        </Button>
        <output aria-live="polite" className="min-w-20 text-center text-lg font-semibold tabular-nums">
          {draft.size} người
        </output>
        <Button type="button" variant="outline" size="icon-lg" className="size-11" aria-label="Thêm một người" disabled={draft.size >= MAX_TEAM_SIZE} onClick={() => handleStep(1)}>
          <Plus aria-hidden />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Tính cả bạn, từ {MIN_TEAM_SIZE} đến {MAX_TEAM_SIZE} người.
      </p>
    </div>
  );
}

function MinutesField({ draft, onChange }: TeamSettingsFieldsProps) {
  function handleMinutesChange(value: RoundMinutes) {
    draft.setMinutes(value);
    onChange?.();
  }

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">Thời lượng mỗi hiệp</legend>
      <div className="flex h-11 items-center gap-5">
        {ROUND_MINUTES.map((value) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 rounded-md has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
            <input
              type="radio"
              name="arena-minutes"
              value={value}
              checked={draft.minutes === value}
              onChange={() => handleMinutesChange(value)}
              className="size-5 cursor-pointer accent-primary"
            />
            <span className="font-medium tabular-nums">{value} phút</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TeamSettingsFields({ draft, onChange, minSize }: TeamSettingsFieldsProps) {
  return (
    <>
      <SizeStepper draft={draft} onChange={onChange} minSize={minSize} />
      <SettingsFields draft={draft} onChange={onChange} timing={<MinutesField draft={draft} onChange={onChange} />} />
    </>
  );
}
