import {
  KIND_RULES,
  MB,
  kindOf,
  type Kind,
} from "@/server/practices/file-upload/upload.schema";

export type Rules = {
  maxSizeMB: number;
  maxFiles: number;
  allowedKinds: Kind[];
};

export const DEFAULT_RULES: Rules = { maxSizeMB: 50, maxFiles: 20, allowedKinds: ["image", "pdf", "text", "zip"] };

/** The same file picked again: name, size, last change and type all match. */
export function fingerprint(file: File) {
  return [file.name, file.size, file.lastModified, file.type].join("|");
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

export function allowedLabel(rules: Rules) {
  return rules.allowedKinds.map((k) => KIND_RULES[k].label).join(", ");
}

/** Returns the reason a file is rejected, or null when it may upload. */
export function rejectReason(file: { name: string; size: number; type: string }, rules: Rules): string | null {
  const kind = kindOf(file.name, file.type);
  if (!kind || !rules.allowedKinds.includes(kind)) return `Type not allowed (allowed: ${allowedLabel(rules)})`;
  if (file.size === 0) return "File is empty";
  if (file.size > rules.maxSizeMB * MB) return `Larger than ${rules.maxSizeMB} MB (${formatBytes(file.size)})`;
  return null;
}
