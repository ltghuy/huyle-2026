"use client";

import { FolderUp, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { filesFromDrop, filesFromList } from "./collect-files";
import { allowedLabel, type Rules } from "./rules";
import { uploads } from "./upload-store";

function hasFiles(e: DragEvent | React.DragEvent) {
  return [...(e.dataTransfer?.types ?? [])].includes("Files");
}

/** Pasted files (e.g. a screenshot), unless the user is typing in a field. */
function handlePaste(e: ClipboardEvent) {
  const target = e.target as HTMLElement | null;
  if (target?.closest("input, textarea, [contenteditable='true']")) return;
  const files = e.clipboardData?.files;
  if (!files?.length) return;
  e.preventDefault();
  uploads.add(filesFromList(files));
}

/** A file dropped next to the zone would otherwise make the browser navigate to it. */
function preventStrayDrop(e: DragEvent) {
  if (hasFiles(e)) e.preventDefault();
}

export function DropZone({ rules }: { rules: Rules }) {
  const [dragging, setDragging] = useState(false);
  // dragenter/dragleave also fire for child elements: count them.
  const depth = useRef(0);
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const rulesId = useId();

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    window.addEventListener("dragover", preventStrayDrop);
    window.addEventListener("drop", preventStrayDrop);
    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("dragover", preventStrayDrop);
      window.removeEventListener("drop", preventStrayDrop);
    };
  }, []);

  function handleDragEnter(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth.current++;
    setDragging(true);
  }

  function handleDragLeave() {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  }

  function handleDragOver(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    // Entries are read synchronously inside filesFromDrop, before the event ends.
    void filesFromDrop(e.dataTransfer).then(uploads.add);
  }

  function handlePicked(e: React.ChangeEvent<HTMLInputElement>) {
    uploads.add(filesFromList(e.target.files));
    e.target.value = ""; // picking the same file again still fires change
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors motion-reduce:transition-none",
        dragging ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <Upload aria-hidden className="size-8 text-foreground/75" />
      <p className="font-medium">{dragging ? "Release to add files" : "Drop files or a folder here, or paste them"}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" className="h-11 sm:h-9" onClick={() => filesInput.current?.click()} aria-describedby={rulesId}>
          <Upload aria-hidden /> Choose files
        </Button>
        <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => folderInput.current?.click()} aria-describedby={rulesId}>
          <FolderUp aria-hidden /> Choose a folder
        </Button>
      </div>
      <p id={rulesId} className="text-sm text-foreground/75">
        {allowedLabel(rules)} · up to {rules.maxSizeMB} MB each · {rules.maxFiles} files at a time
      </p>
      <input ref={filesInput} type="file" multiple hidden onChange={handlePicked} />
      <input
        ref={folderInput}
        type="file"
        multiple
        hidden
        onChange={handlePicked}
        // Not in React's typings yet; supported by all major browsers.
        {...{ webkitdirectory: "" }}
      />
    </div>
  );
}
