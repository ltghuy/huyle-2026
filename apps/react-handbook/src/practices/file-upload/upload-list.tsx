"use client";

import { Pause, Play, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

import { FileRow } from "./file-row";
import { formatBytes } from "./rules";
import { uploads, type UploadSnapshot } from "./upload-store";

const COUNTED = new Set(["queued", "uploading", "paused", "waiting-network", "verifying", "done", "failed"]);

export function UploadList({ snapshot }: { snapshot: UploadSnapshot }) {
  const { items, announcement, online } = snapshot;
  const liveRef = useRef<HTMLParagraphElement>(null);

  // Write announcements into one polite region; progress itself is never announced.
  useEffect(() => {
    if (announcement && liveRef.current) liveRef.current.textContent = announcement.text;
  }, [announcement]);

  const counted = items.filter((i) => COUNTED.has(i.status));
  const totalBytes = counted.reduce((sum, i) => sum + i.size, 0);
  const doneBytes = counted.reduce((sum, i) => sum + i.confirmed, 0);
  const doneFiles = counted.filter((i) => i.status === "done").length;
  const percent = totalBytes ? Math.floor((doneBytes / totalBytes) * 100) : 0;
  const queue = items.filter((i) => i.status === "queued").sort((a, b) => a.order - b.order).map((i) => i.id);
  const has = (...statuses: string[]) => items.some((i) => statuses.includes(i.status));

  return (
    <section aria-labelledby="upload-list-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="upload-list-heading" className="font-semibold">
          Uploads
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={!has("uploading", "queued", "waiting-network")} onClick={uploads.pauseAll}>
            <Pause aria-hidden /> Pause all
          </Button>
          <Button variant="outline" size="sm" disabled={!has("paused")} onClick={uploads.resumeAll}>
            <Play aria-hidden /> Resume all
          </Button>
          <Button variant="outline" size="sm" disabled={!has("uploading", "queued", "paused", "waiting-network", "failed", "verifying")} onClick={uploads.cancelAll}>
            <X aria-hidden /> Cancel all
          </Button>
          <Button variant="ghost" size="sm" disabled={!has("done", "rejected", "duplicate")} onClick={uploads.clearFinished}>
            <Trash2 aria-hidden /> Clear finished
          </Button>
        </div>
      </div>

      {counted.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div
            role="progressbar"
            aria-label="Overall upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full bg-primary transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-foreground/75 tabular-nums">
            {formatBytes(doneBytes)} of {formatBytes(totalBytes)} · {doneFiles} of {counted.length} files done
            {online ? "" : " · Offline: uploads continue when the network is back"}
          </p>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-foreground/75">
          No uploads yet. Add files above, or use “Add sample files” in the demo controls.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <FileRow key={item.id} item={item} queuePosition={item.status === "queued" ? queue.indexOf(item.id) + 1 : null} />
          ))}
        </ul>
      )}
      <p ref={liveRef} role="status" className="sr-only" />
    </section>
  );
}
