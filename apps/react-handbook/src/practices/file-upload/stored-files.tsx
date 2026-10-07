"use client";

import { CircleCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/practices/toast-notifications/toast-store";
import type { FilesResponse, StoredFile } from "@/server/practices/file-upload/upload.schema";

import { formatBytes } from "./rules";
import { uploads } from "./upload-store";

const TIME = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function handleDelete(file: StoredFile) {
  uploads.deleteStored(file.id).catch((error: unknown) =>
    toast.error("Couldn't delete the file", { description: error instanceof Error ? error.message : String(error) }),
  );
}

export function StoredFiles({ stored }: { stored: FilesResponse | null }) {
  const files = stored?.files ?? [];
  return (
    <section aria-labelledby="stored-files-heading" className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="stored-files-heading" className="font-semibold">
          Uploaded files on the server
        </h3>
        {stored ? (
          <p className="text-xs text-foreground/75 tabular-nums">
            {formatBytes(stored.usedBytes)} of {formatBytes(stored.limitBytes)} used · oldest removed first
          </p>
        ) : null}
      </div>
      {files.length === 0 ? (
        <p className="text-sm text-foreground/75">Nothing stored yet.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium" title={file.path ?? file.name}>{file.path ?? file.name}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-foreground/75">
                  <span>{formatBytes(file.size)}</span>
                  <time dateTime={file.completedAt}>{TIME.format(new Date(file.completedAt))}</time>
                  {file.verified ? (
                    <span className="inline-flex items-center gap-1 text-success" title={`SHA-256 ${file.sha256}`}>
                      <CircleCheck aria-hidden className="size-3.5" /> Checksum matches
                    </span>
                  ) : null}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="size-11 sm:size-8" aria-label={`Delete ${file.name} from the server`} onClick={() => handleDelete(file)}>
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
