"use client";

import { useId, useState } from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";

import { CacheInspector } from "./cache-inspector";
import { queryClient, type QueryDefaults } from "./query-client";
import { useOptimisticPatch } from "./use-optimistic-patch";
import { UserDetail } from "./user-detail";
import { UsersList } from "./users-list";
import { network } from "./users-api";

const LATENCIES = [
  { value: 0, label: "0 ms" },
  { value: 300, label: "300 ms" },
  { value: 600, label: "600 ms" },
  { value: 1500, label: "1500 ms" },
  { value: 3000, label: "3000 ms" },
  { value: -1, label: "Random (100–2000 ms)" },
];
const STALE_TIMES = [
  { value: 0, label: "0 s" },
  { value: 5000, label: "5 s" },
  { value: 30_000, label: "30 s" },
  { value: Infinity, label: "Never" },
];
const PANEL_COUNTS = [1, 2, 3].map((n) => ({ value: n, label: String(n) }));
const GC_TIMES = [
  { value: 10_000, label: "10 s" },
  { value: 60_000, label: "1 min" },
  { value: 300_000, label: "5 min" },
];

export function Demo() {
  const [defaults, setDefaults] = useState<QueryDefaults>(() => queryClient.getDefaults());
  const [net, setNet] = useState(() => ({ ...network }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panels, setPanels] = useState(1);
  const mutation = useOptimisticPatch();
  const ids = {
    latency: useId(), fail: useId(), saveFail: useId(), stale: useId(),
    gc: useId(), retry: useId(), focus: useId(), second: useId(),
  };

  function updateDefaults(changes: Partial<QueryDefaults>) {
    queryClient.setDefaults(changes);
    setDefaults(queryClient.getDefaults());
  }

  function updateNetwork(changes: Partial<typeof network>) {
    Object.assign(network, changes);
    setNet({ ...network });
  }

  return (
    <>
      <DemoControls>
        <Select id={ids.latency} label="Latency" value={net.latencyMs} options={LATENCIES} onChange={(v) => updateNetwork({ latencyMs: v })} />
        <Range id={ids.fail} label="Read failure" value={Math.round(net.failRate * 100)} onChange={(v) => updateNetwork({ failRate: v / 100 })} />
        <Range id={ids.saveFail} label="Save failure" value={Math.round(net.saveFailRate * 100)} onChange={(v) => updateNetwork({ saveFailRate: v / 100 })} />
        <Select id={ids.stale} label="Stale time" value={defaults.staleTime} options={STALE_TIMES} onChange={(v) => updateDefaults({ staleTime: v })} />
        <Select id={ids.gc} label="Removal time" value={defaults.gcTime} options={GC_TIMES} onChange={(v) => updateDefaults({ gcTime: v })} />
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.retry} className="text-xs font-medium text-muted-foreground">
            Retries: {defaults.retry}
          </label>
          <input
            id={ids.retry}
            type="range"
            min={0}
            max={5}
            value={defaults.retry}
            onChange={(e) => updateDefaults({ retry: Number(e.target.value) })}
            className="h-8 w-28 accent-primary"
          />
        </div>
        <Checkbox id={ids.focus} label="Refresh on focus / reconnect" checked={defaults.refetchOnFocus} onChange={(v) => updateDefaults({ refetchOnFocus: v })} />
        <Select id={ids.second} label="Detail panels (same key)" value={panels} options={PANEL_COUNTS} onChange={setPanels} />
      </DemoControls>

      <DemoStage>
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
            <UsersList selectedId={selectedId} onSelect={setSelectedId} mutation={mutation} />
            <div className="flex min-w-0 flex-col gap-4">
              {selectedId ? (
                Array.from({ length: panels }, (_, i) => (
                  <UserDetail
                    key={i}
                    id={selectedId}
                    title={i === 0 ? "Detail" : `Panel ${i + 1} (same key)`}
                    mutation={mutation}
                  />
                ))
              ) : (
                <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Select a user. Hover a name for 150 ms to prefetch it.
                </p>
              )}
            </div>
          </div>
          <CacheInspector />
        </div>
      </DemoStage>
    </>
  );
}

type Option = { value: number; label: string };

function Select({ id, label, value, options, onChange }: {
  id: string; label: string; value: number; options: Option[]; onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        id={id}
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 rounded-md border bg-background px-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.label} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Range({ id, label, value, onChange }: {
  id: string; label: string; value: number; onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}: {value}%</label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-28 accent-primary"
      />
    </div>
  );
}

function Checkbox({ id, label, checked, onChange }: {
  id: string; label: string; checked: boolean; onChange: (value: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex h-8 items-center gap-2 self-end text-sm">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-primary" />
      {label}
    </label>
  );
}
