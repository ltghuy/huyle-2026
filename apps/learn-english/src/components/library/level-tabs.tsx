"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { LEVELS, type Level } from "@/learning/types";

interface LevelTabsProps<Extra extends string> {
  value: Level | Extra;
  onChange: (value: Level | Extra) => void;
  label?: string;
  /** One more tab after the levels, such as "Chuyên ngành" on Từ vựng (feature 012). */
  extra?: { value: Extra; label: string };
}

/** CEFR level switcher (A1–C1); arrow keys move between levels. */
export function LevelTabs<Extra extends string = never>({ value, onChange, label = "Trình độ", extra }: LevelTabsProps<Extra>) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as Level | Extra)}>
      <TabsList aria-label={label} className="w-full group-data-horizontal/tabs:h-11 sm:w-fit">
        {LEVELS.map((level) => (
          // Six tabs must fit a 360 px phone, so the levels narrow there when an extra tab is shown.
          <TabsTrigger key={level} value={level} className={cn("px-3 text-base", extra ? "min-w-0 px-1.5 sm:min-w-14 sm:px-3" : "min-w-14")}>
            {level}
          </TabsTrigger>
        ))}
        {extra ? (
          <TabsTrigger value={extra.value} className="px-2 text-base sm:px-3">
            {extra.label}
          </TabsTrigger>
        ) : null}
      </TabsList>
    </Tabs>
  );
}
