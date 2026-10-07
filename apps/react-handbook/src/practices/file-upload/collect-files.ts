// Turns drops, pastes and picker selections into a flat list of files, each
// with its path when it came from a dropped folder.

export type Picked = { file: File; path: string | null };

function readAll(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  // readEntries returns entries in batches; keep reading until it returns none.
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const next = () =>
      reader.readEntries((batch) => {
        if (batch.length === 0) return resolve(all);
        all.push(...batch);
        next();
      }, reject);
    next();
  });
}

async function walk(entry: FileSystemEntry, out: Picked[]) {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
    // fullPath starts with "/" and includes the file name.
    const path = entry.fullPath.replace(/^\//, "");
    out.push({ file, path: path.includes("/") ? path : null });
    return;
  }
  if (entry.isDirectory) {
    for (const child of await readAll((entry as FileSystemDirectoryEntry).createReader())) await walk(child, out);
  }
}

/** Reads a drop, including folders. Entries must be taken synchronously, before the event ends. */
export async function filesFromDrop(data: DataTransfer): Promise<Picked[]> {
  const entries = [...data.items]
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry?.() ?? null);
  if (entries.length === 0 || entries.some((e) => e === null)) {
    return [...data.files].map((file) => ({ file, path: null }));
  }
  const out: Picked[] = [];
  for (const entry of entries) await walk(entry!, out);
  return out;
}

export function filesFromList(list: FileList | null): Picked[] {
  return [...(list ?? [])].map((file) => ({ file, path: file.webkitRelativePath || null }));
}
