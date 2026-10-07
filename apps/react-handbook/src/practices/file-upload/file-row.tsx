"use client";

import {
  Ban,
  CircleAlert,
  CircleCheck,
  Clock,
  Copy,
  File,
  FileArchive,
  FileImage,
  FileText,
  Hourglass,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  WifiOff,
  X,
} from "lucide-react";
import { memo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kindOf } from "@/server/practices/file-upload/upload.schema";

import { formatBytes } from "./rules";
import { uploads, type UploadItem } from "./upload-store";

const KIND_ICONS = { image: FileImage, pdf: FileText, text: FileText, zip: FileArchive } as const;

function formatEta(seconds: number) {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} s left`;
  return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s left`;
}

function statusLabel(item: UploadItem, queuePosition: number | null) {
  switch (item.status) {
    case "queued":
      return { icon: Clock, text: queuePosition ? `Queued #${queuePosition}` : "Queued", tone: "" };
    case "uploading":
      return item.attempt > 0
        ? { icon: RotateCcw, text: `Retrying (try ${item.attempt + 1} of 12): ${item.reason ?? ""}`, tone: "text-foreground" }
        : { icon: LoaderCircle, text: "Uploading", tone: "" };
    case "paused":
      return { icon: Pause, text: "Paused", tone: "" };
    case "waiting-network":
      return { icon: WifiOff, text: "Waiting for the network", tone: "" };
    case "verifying":
      return { icon: Hourglass, text: "Verifying…", tone: "" };
    case "done":
      return { icon: CircleCheck, text: "Uploaded and verified", tone: "text-success" };
    case "failed":
      return { icon: CircleAlert, text: `Failed: ${item.reason}`, tone: "text-destructive" };
    case "rejected":
      return { icon: Ban, text: `Not added: ${item.reason}`, tone: "text-destructive" };
    case "duplicate":
      return { icon: Copy, text: "Not added: already in the list", tone: "text-destructive" };
    case "interrupted":
      return { icon: CircleAlert, text: "Interrupted: add the same file again to resume", tone: "text-foreground" };
  }
}

export const FileRow = memo(function FileRow({ item, queuePosition }: { item: UploadItem; queuePosition: number | null }) {
  const kind = kindOf(item.name, item.type);
  const Icon = kind ? KIND_ICONS[kind] : File;
  const status = statusLabel(item, queuePosition);
  const StatusIcon = status.icon;
  const showBar = !["rejected", "duplicate"].includes(item.status);
  const percent = item.size ? Math.floor((item.confirmed / item.size) * 100) : 0;
  const inFlightPercent = item.size ? Math.min(100 - percent, (item.inFlight / item.size) * 100) : 0;
  const fullName = item.path ?? item.name;
  // An image that can't be decoded falls back to the type icon.
  const [previewFailed, setPreviewFailed] = useState(false);

  return (
    <li className="flex gap-3 rounded-lg border p-3">
      {item.previewUrl && !previewFailed ? (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
        <img src={item.previewUrl} alt="" onError={() => setPreviewFailed(true)} className="size-10 shrink-0 rounded-md object-cover" />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon aria-hidden className="size-5 text-foreground/75" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={fullName}>{item.name}</p>
            <p className="truncate text-xs text-foreground/75" title={fullName}>
              {item.path ? `${item.path} · ` : ""}{formatBytes(item.size)}
            </p>
          </div>
          <RowActions item={item} />
        </div>
        <p className={cn("flex items-center gap-1.5 text-xs", status.tone || "text-foreground/75")}>
          <StatusIcon aria-hidden className={cn("size-3.5 shrink-0", item.status === "uploading" && item.attempt === 0 && "motion-safe:animate-spin")} />
          <span className="min-w-0 break-words">{status.text}</span>
        </p>
        {showBar ? (
          <>
            <div
              role="progressbar"
              aria-label={`${item.name} upload progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-valuetext={`${percent}% confirmed by the server`}
              className="flex h-2 overflow-hidden rounded-full bg-muted"
            >
              <div className="bg-primary transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
              <div className="bg-primary/30" style={{ width: `${inFlightPercent}%` }} />
            </div>
            <p className="text-xs text-foreground/75 tabular-nums">
              {percent}% · {formatBytes(item.confirmed)} of {formatBytes(item.size)}
              {item.status === "uploading" && item.speed ? ` · ${formatBytes(item.speed)}/s` : ""}
              {item.status === "uploading" && item.eta !== null ? ` · ${formatEta(item.eta)}` : ""}
            </p>
          </>
        ) : null}
      </div>
    </li>
  );
});

function RowActions({ item }: { item: UploadItem }) {
  const { status, name } = item;
  const canPause = status === "uploading" || status === "queued" || status === "waiting-network";
  const canResume = status === "paused";
  const canRetry = status === "failed";
  const canCancel = !["done", "rejected", "duplicate", "interrupted"].includes(status);
  const canRemove = ["done", "rejected", "duplicate", "interrupted"].includes(status);
  const size = "size-11 sm:size-8";

  return (
    <div className="flex shrink-0 gap-1">
      {canPause ? (
        <Button variant="ghost" size="icon" className={size} aria-label={`Pause ${name}`} onClick={() => uploads.pause(item.id)}>
          <Pause aria-hidden />
        </Button>
      ) : null}
      {canResume ? (
        <Button variant="ghost" size="icon" className={size} aria-label={`Resume ${name}`} onClick={() => uploads.resume(item.id)}>
          <Play aria-hidden />
        </Button>
      ) : null}
      {canRetry ? (
        <Button variant="ghost" size="icon" className={size} aria-label={`Retry ${name}`} onClick={() => uploads.retry(item.id)}>
          <RotateCcw aria-hidden />
        </Button>
      ) : null}
      {canCancel ? (
        <Button variant="ghost" size="icon" className={size} aria-label={`Cancel ${name}`} onClick={() => uploads.cancel(item.id)}>
          <X aria-hidden />
        </Button>
      ) : null}
      {canRemove ? (
        <Button
          variant="ghost"
          size="icon"
          className={size}
          aria-label={status === "interrupted" ? `Forget ${name}` : `Remove ${name} from the list`}
          onClick={() => uploads.remove(item.id)}
        >
          <X aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
