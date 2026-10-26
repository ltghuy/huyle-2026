"use client";

import { useListStats, type UpdateCause } from "./list-stats";
import { numberFormat } from "./ticket-row";

const CAUSES: Record<UpdateCause, string> = {
  mode: "mode switch",
  rows: "new list",
  filter: "filter",
  sort: "sort",
  scroll: "scroll",
  jump: "jump",
  settings: "settings",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt>{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function StatsBar({ virtual }: { virtual: boolean }) {
  const stats = useListStats();
  const range =
    stats.visibleStart === null || stats.visibleEnd === null
      ? "–"
      : `${numberFormat.format(stats.visibleStart + 1)}–${numberFormat.format(stats.visibleEnd + 1)}`;
  const cause = stats.cause ? ` (${CAUSES[stats.cause]})` : "";
  const update = stats.lastUpdateMs === null ? "–" : `${stats.lastUpdateMs.toFixed(1)} ms${cause}`;

  return (
    <dl
      aria-label="List statistics"
      className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground tabular-nums"
    >
      <Stat label="Rows on page" value={numberFormat.format(stats.onPage)} />
      <Stat label="In list" value={numberFormat.format(stats.inList)} />
      <Stat label="Visible" value={range} />
      <Stat label="Last update" value={update} />
      {virtual && stats.measured !== null ? (
        <Stat label="Measured" value={numberFormat.format(stats.measured)} />
      ) : null}
    </dl>
  );
}
