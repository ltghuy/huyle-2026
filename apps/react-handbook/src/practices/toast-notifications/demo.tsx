"use client";

import { RotateCcw, Save, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";
import { Button } from "@/components/ui/button";

import {
  toast,
  toaster,
  useToastState,
  type ToastPosition,
} from "./toast-store";

const POSITIONS: ToastPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

const INITIAL_ITEMS = ["Invoice #1042", "Invoice #1043", "Invoice #1044", "Invoice #1045"];

const BURST = [
  ["success", "Profile updated"],
  ["info", "3 new comments"],
  ["warning", "Storage almost full"],
  ["success", "Draft saved"],
  ["error", "Sync failed"],
  ["info", "Backup started"],
  ["success", "Invite sent"],
  ["warning", "Session expires in 5 minutes"],
  ["info", "New version available"],
  ["success", "Settings applied"],
] as const;

// Each burst gets its own label so repeated bursts don't merge.
let burstRun = 0;
function raiseBurst() {
  burstRun += 1;
  for (const [type, title] of BURST) {
    toast[type](title, { description: `Burst #${burstRun}` });
  }
}

function raiseError() {
  toast.error("Payment declined", { description: "Your card was declined by the bank." });
}

function raiseInfo() {
  toast.info("Heads up", { description: "Maintenance tonight at 22:00." });
}

function raiseActionToast() {
  toast.info("Message archived", {
    action: { label: "View", onAction: openArchive },
  });
}

function openArchive() {
  toast.success("Opened archive");
}

function saveMessages(latency: number) {
  return {
    loading: { title: "Saving…", description: `Simulated latency ${latency} ms` },
    success: (data: { savedAt: string }) => ({
      title: "Saved",
      description: `At ${new Date(data.savedAt).toLocaleTimeString()}`,
    }),
    error: (error: unknown) => ({
      title: "Save failed",
      description: error instanceof Error ? error.message : String(error),
    }),
  };
}

async function saveRequest(latencyMs: number, failRate: number) {
  const res = await fetch("/api/practices/toast-notifications/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ latencyMs, failRate }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  return json.data as { savedAt: string };
}

export function Demo() {
  const { settings } = useToastState();
  const [latency, setLatency] = useState(1500);
  const [failPercent, setFailPercent] = useState(30);
  const [items, setItems] = useState(INITIAL_ITEMS);
  const ids = { position: useId(), duration: useId(), max: useId(), latency: useId(), fail: useId() };

  function handleDelete(name: string) {
    const index = items.indexOf(name);
    setItems((current) => current.filter((item) => item !== name));
    toast.info(`Deleted ${name}`, {
      action: {
        label: "Undo",
        onAction: () =>
          setItems((current) => {
            if (current.includes(name)) return current;
            const next = [...current];
            next.splice(Math.min(index, next.length), 0, name);
            return next;
          }),
      },
    });
  }

  function handleSave() {
    void toast
      .promise(saveRequest(latency, failPercent / 100), saveMessages(latency))
      .catch(() => {});
  }

  return (
    <>
      <DemoControls>
        <div className="flex w-full flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.success("Changes saved")}>
            Success
          </Button>
          <Button variant="outline" onClick={raiseError}>
            Error
          </Button>
          <Button variant="outline" onClick={raiseInfo}>
            Info
          </Button>
          <Button variant="outline" onClick={() => toast.warning("Unsaved changes")}>
            Warning
          </Button>
          <Button variant="outline" onClick={raiseActionToast}>
            With action
          </Button>
          <Button variant="outline" onClick={raiseBurst}>
            Burst (10)
          </Button>
          <Button variant="ghost" onClick={() => toast.dismissAll()}>
            Dismiss all
          </Button>
        </div>

        <Field id={ids.position} label="Position">
          <select
            id={ids.position}
            value={settings.position}
            onChange={(e) => toaster.configure({ position: e.target.value as ToastPosition })}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>

        <Range
          id={ids.duration}
          label="Duration"
          value={settings.duration / 1000}
          min={1}
          max={15}
          unit="s"
          onChange={(v) => toaster.configure({ duration: v * 1000 })}
        />
        <Range
          id={ids.max}
          label="Max visible"
          value={settings.maxVisible}
          min={1}
          max={6}
          onChange={(v) => toaster.configure({ maxVisible: v })}
        />
        <Range
          id={ids.latency}
          label="Save latency"
          value={latency}
          min={0}
          max={5000}
          step={250}
          unit="ms"
          onChange={setLatency}
        />
        <Range
          id={ids.fail}
          label="Save failure rate"
          value={failPercent}
          min={0}
          max={100}
          step={10}
          unit="%"
          onChange={setFailPercent}
        />
      </DemoControls>

      <DemoStage>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Delete with Undo</h3>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices left.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((name) => (
                  <li
                    key={name}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    {name}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Delete ${name}`}
                      onClick={() => handleDelete(name)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setItems(INITIAL_ITEMS)}
            >
              <RotateCcw aria-hidden /> Reset list
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Track a request</h3>
            <p className="text-sm text-muted-foreground">
              Sends a real request to the mock API. One toast follows it from
              loading to the result.
            </p>
            <Button className="self-start" onClick={handleSave}>
              <Save aria-hidden /> Save (simulated request)
            </Button>
          </div>
        </div>
      </DemoStage>
    </>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Range({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <Field id={id} label={`${label}: ${value}${unit}`}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-36 accent-primary"
      />
    </Field>
  );
}
