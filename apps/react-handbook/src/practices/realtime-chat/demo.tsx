"use client";

import { ExternalLink, Trash2, Unplug, WifiOff, Zap } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";
import { Button } from "@/components/ui/button";
import { toast } from "@/practices/toast-notifications/toast-store";
import type { Activity } from "@/server/practices/realtime-chat/chat.schema";

import { dropConnection, getActivity, network, setActivity } from "./chat-api";
import { ConnectionBadge, TypingLine } from "./chat-status";
import { chat, useChat, type ChatSnapshot } from "./chat-store";
import { Composer } from "./composer";
import { MessageList } from "./message-list";
import { NameField } from "./name-field";

const LATENCIES = [
  { value: 0, label: "0 ms" },
  { value: 300, label: "300 ms" },
  { value: 1500, label: "1500 ms" },
  { value: 5000, label: "5000 ms" },
  { value: -1, label: "Random (100–2000 ms)" },
];
const ACTIVITY_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "normal", label: "Normal" },
];
/** Reconnecting longer than this raises a toast. */
const LONG_OUTAGE_MS = 10_000;

function showError(title: string) {
  return (error: unknown) =>
    toast.error(title, { description: error instanceof Error ? error.message : String(error) });
}

function openAnotherTab() {
  window.open(window.location.href, "_blank", "noopener");
}

/** One warning after a long outage, and a "Reconnected" once it's over. */
function useOutageToasts(status: ChatSnapshot["connection"]["status"]) {
  const warned = useRef(false);
  useEffect(() => {
    if (status === "live") {
      if (warned.current) toast.success("Reconnected", { description: "Missed messages were filled in." });
      warned.current = false;
      return;
    }
    if (status === "connecting" || warned.current) return;
    const timer = setTimeout(() => {
      warned.current = true;
      toast.warning("Connection lost", { description: "Still trying to reconnect. Messages you send will be retried." });
    }, LONG_OUTAGE_MS);
    return () => clearTimeout(timer);
  }, [status]);
}

export function Demo() {
  const snapshot = useChat();
  const [net, setNet] = useState(() => ({ ...network }));
  const [activity, setActivityState] = useState<Activity>("normal");
  const [bursting, setBursting] = useState(false);
  const [offline, setOffline] = useState(false);
  const [scrollRequest, setScrollRequest] = useState(0);
  const ids = { latency: useId(), fail: useId(), activity: useId(), offline: useId() };

  useEffect(() => {
    const unmount = chat.mount();
    return () => {
      // The "Go offline" switch belongs to this visit.
      chat.setSimulatedOffline(false);
      unmount();
    };
  }, []);
  useOutageToasts(snapshot.connection.status);

  useEffect(() => {
    getActivity().then((data) => setActivityState(data.activity === "off" ? "off" : "normal"), () => {});
  }, []);

  function updateNetwork(changes: Partial<typeof network>) {
    Object.assign(network, changes);
    setNet({ ...network });
  }

  function changeActivity(value: Activity) {
    setActivity(value).then((data) => setActivityState(data.activity), showError("Couldn't change activity"));
  }

  function handleBurst() {
    setBursting(true);
    setActivity("burst")
      .catch(showError("Couldn't start a burst"))
      .finally(() => setTimeout(() => setBursting(false), 3500));
  }

  function handleClear() {
    chat.clearHistory().catch(showError("Couldn't clear the conversation"));
  }

  function handleDrop() {
    dropConnection(snapshot.tabId).catch(showError("Couldn't drop the connection"));
  }

  function handleOfflineChange(value: boolean) {
    setOffline(value);
    chat.setSimulatedOffline(value);
  }

  return (
    <>
      <DemoControls>
        <Select id={ids.latency} label="Latency" value={String(net.latencyMs)} options={LATENCIES} onChange={(v) => updateNetwork({ latencyMs: Number(v) })} />
        <Range id={ids.fail} label="Send / history failure" value={Math.round(net.failRate * 100)} onChange={(v) => updateNetwork({ failRate: v / 100 })} />
        <Select id={ids.activity} label="Simulated people" value={activity} options={ACTIVITY_OPTIONS} onChange={(v) => changeActivity(v as Activity)} />
        <Button variant="outline" size="sm" onClick={handleBurst} disabled={bursting}>
          <Zap aria-hidden /> Burst (50 messages)
        </Button>
        <Button variant="outline" size="sm" onClick={handleDrop}>
          <Unplug aria-hidden /> Drop connection
        </Button>
        <Button variant="outline" size="sm" onClick={handleClear}>
          <Trash2 aria-hidden /> Clear conversation
        </Button>
        <label htmlFor={ids.offline} className="flex h-8 items-center gap-2 self-end text-sm">
          <input id={ids.offline} type="checkbox" checked={offline} onChange={(e) => handleOfflineChange(e.target.checked)} className="size-4 accent-primary" />
          <WifiOff aria-hidden className="size-4" /> Go offline
        </label>
        <Button variant="outline" size="sm" onClick={openAnotherTab}>
          <ExternalLink aria-hidden /> Open another tab
        </Button>
      </DemoControls>

      <DemoStage>
        <div className="grid gap-4 lg:grid-cols-[1fr_14rem]">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold"># general</h3>
              <ConnectionBadge info={snapshot.connection} />
            </div>
            <NameField name={snapshot.name} />
            <MessageList snapshot={snapshot} scrollRequest={scrollRequest} />
            <TypingLine typing={snapshot.typing} />
            <Composer onSent={() => setScrollRequest((n) => n + 1)} />
          </div>
          <StreamStats snapshot={snapshot} />
        </div>
      </DemoStage>
    </>
  );
}

function StreamStats({ snapshot }: { snapshot: ChatSnapshot }) {
  const { stats, connection, messages } = snapshot;
  const pending = messages.filter((m) => m.seq === null).length;
  const rows = [
    ["Messages loaded", messages.length - pending],
    ["Waiting to send", pending],
    ["Received live", stats.received - stats.replayed],
    ["Replayed on reconnect", stats.replayed],
    ["Duplicates dropped", stats.duplicates],
    ["Resets (gap too old)", stats.resets],
    ["Reconnect attempt", connection.attempt],
  ] as const;

  return (
    <section aria-labelledby="stream-stats-heading" className="h-fit rounded-lg border p-3 text-sm">
      <h3 id="stream-stats-heading" className="mb-2 font-medium">Stream stats</h3>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-foreground/75">{label}</dt>
            <dd className="text-right font-mono tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

type Option = { value: number | string; label: string };

function Select({ id, label, value, options, onChange }: {
  id: string; label: string; value: string; options: Option[]; onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
