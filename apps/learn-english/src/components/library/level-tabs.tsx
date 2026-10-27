"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LEVELS, type Level } from "@/learning/types";

/** CEFR level switcher (A1–C1); arrow keys move between levels. */
export function LevelTabs({ value, onChange, label = "Trình độ" }: { value: Level; onChange: (level: Level) => void; label?: string }) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as Level)}>
      <TabsList aria-label={label} className="w-full group-data-horizontal/tabs:h-11 sm:w-fit">
        {LEVELS.map((level) => (
          <TabsTrigger key={level} value={level} className="min-w-14 px-3 text-base">
            {level}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
