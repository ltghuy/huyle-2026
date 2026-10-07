"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";
import { Button } from "@/components/ui/button";
import { toast } from "@/practices/toast-notifications/toast-store";
import { KINDS, KIND_RULES, MB, type Kind } from "@/server/practices/file-upload/upload.schema";

import { DropZone } from "./drop-zone";
import { sampleFiles } from "./sample-files";
import { StoredFiles } from "./stored-files";
import { UploadList } from "./upload-list";
import { uploads, useUploads } from "./upload-store";

const SPEEDS = [
  { value: "64", label: "64 KB/s" },
  { value: "256", label: "256 KB/s" },
  { value: "1024", label: "1 MB/s" },
  { value: "5120", label: "5 MB/s" },
  { value: "unlimited", label: "Unlimited" },
];
const PIECE_SIZES = [
  { value: String(256 * 1024), label: "256 KB" },
  { value: String(MB), label: "1 MB" },
  { value: String(2 * MB), label: "2 MB" },
  { value: String(5 * MB), label: "5 MB" },
];
const MAX_SIZES = [5, 20, 50, 100].map((n) => ({ value: String(n), label: `${n} MB` }));
const MAX_FILES = [5, 10, 20, 50].map((n) => ({ value: String(n), label: String(n) }));
const CONCURRENCY = [1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }));

function showError(title: string) {
  return (error: unknown) =>
    toast.error(title, { description: error instanceof Error ? error.message : String(error) });
}

async function addSamples() {
  const files = await sampleFiles();
  uploads.add(files.map((file) => ({ file, path: null })));
}

export function Demo() {
  const snapshot = useUploads();
  const { settings, server } = snapshot;
  const [generating, setGenerating] = useState(false);
  const ids = {
    speed: useId(), fail: useId(), concurrency: useId(), piece: useId(), maxSize: useId(), maxFiles: useId(), kinds: useId(),
  };

  useEffect(() => uploads.init(), []);

  function handleSpeed(value: string) {
    uploads.setNetwork({ speedKBps: value === "unlimited" ? null : Number(value) }).catch(showError("Couldn't change the speed"));
  }

  function handleFailRate(percent: number) {
    uploads.setNetwork({ failRate: percent / 100 }).catch(showError("Couldn't change the failure rate"));
  }

  function handleKind(kind: Kind, checked: boolean) {
    const current = settings.rules.allowedKinds;
    const allowedKinds = checked ? [...current, kind] : current.filter((k) => k !== kind);
    uploads.setRules({ allowedKinds }).catch(showError("Couldn't change the rules"));
  }

  function handleSamples() {
    setGenerating(true);
    addSamples()
      .catch(showError("Couldn't create sample files"))
      .finally(() => setGenerating(false));
  }

  return (
    <>
      <DemoControls>
        <Select id={ids.speed} label="Upload speed" value={server.speedKBps === null ? "unlimited" : String(server.speedKBps)} options={SPEEDS} onChange={handleSpeed} />
        <Range id={ids.fail} label="Piece failure" value={Math.round(server.failRate * 100)} onChange={handleFailRate} />
        <Select id={ids.concurrency} label="At once" value={String(settings.concurrency)} options={CONCURRENCY} onChange={(v) => uploads.setEngine({ concurrency: Number(v) })} />
        <Select id={ids.piece} label="Piece size" value={String(settings.pieceSize)} options={PIECE_SIZES} onChange={(v) => uploads.setEngine({ pieceSize: Number(v) })} />
        <Select id={ids.maxSize} label="Max file size" value={String(settings.rules.maxSizeMB)} options={MAX_SIZES} onChange={(v) => void uploads.setRules({ maxSizeMB: Number(v) })} />
        <Select id={ids.maxFiles} label="Max files" value={String(settings.rules.maxFiles)} options={MAX_FILES} onChange={(v) => void uploads.setRules({ maxFiles: Number(v) })} />
        <fieldset className="flex flex-col gap-1">
          <legend id={ids.kinds} className="text-xs font-medium text-muted-foreground">Allowed types</legend>
          <div className="flex flex-wrap gap-3">
            {KINDS.map((kind) => (
              <label key={kind} className="flex h-8 items-center gap-1.5 text-sm">
                <input type="checkbox" checked={settings.rules.allowedKinds.includes(kind)} onChange={(e) => handleKind(kind, e.target.checked)} className="size-4 accent-primary" />
                {KIND_RULES[kind].label}
              </label>
            ))}
          </div>
        </fieldset>
        <Button variant="outline" size="sm" onClick={handleSamples} disabled={generating}>
          <Sparkles aria-hidden /> {generating ? "Creating…" : "Add sample files"}
        </Button>
      </DemoControls>

      <DemoStage>
        <div className="flex flex-col gap-6">
          <DropZone rules={settings.rules} />
          <UploadList snapshot={snapshot} />
          <StoredFiles stored={snapshot.stored} />
        </div>
      </DemoStage>
    </>
  );
}

type Option = { value: string; label: string };

function Select({ id, label, value, options, onChange }: {
  id: string; label: string; value: string; options: Option[]; onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-sm">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
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
      <input id={id} type="range" min={0} max={100} step={10} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-8 w-28 accent-primary" />
    </div>
  );
}
