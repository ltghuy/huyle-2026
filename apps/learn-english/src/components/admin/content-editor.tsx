"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONTENT_KINDS, type ContentKind } from "@/content/schema";
import { LEVELS, type Level } from "@/learning/types";
import { AdminError, fetchContent, fetchContentItem, saveContentItem, setContentRemoved, type ItemIssue } from "@/lib/admin-client";
import { READ_ONLY_KINDS, type AdminContentItem } from "@/server/admin/admin.schema";

// One content item on the admin page (feature 038, AC-014 to AC-017): level, topic and sort as
// fields, the body as JSON, checked by the server with the publish script's rules.

export const KIND_LABELS: Record<ContentKind, string> = {
  word: "Từ",
  grammar: "Ngữ pháp",
  sentence: "Câu",
  writing: "Bài viết",
  placement: "Kiểm tra trình độ",
  forms: "Dạng động từ",
  set: "Bộ từ vựng",
  wording: "Cách nói khác",
};
export const EDITABLE_KINDS = CONTENT_KINDS.filter((kind) => !READ_ONLY_KINDS.includes(kind));
const LEVEL_ITEMS = Object.fromEntries(LEVELS.map((level) => [level, level]));
const KIND_ITEMS = Object.fromEntries(EDITABLE_KINDS.map((kind) => [kind, KIND_LABELS[kind]]));

/** `null` closes the editor; `{ create: true }` adds a new item. */
export type EditorTarget = { create: true } | { create: false; id: string } | null;

interface Draft {
  id: string;
  kind: ContentKind;
  level: Level;
  topic: string;
  sort: string;
  body: string;
}

function draftOf(item: AdminContentItem): Draft {
  return { id: item.id, kind: item.kind, level: item.level as Level, topic: item.topic ?? "", sort: String(item.sort), body: JSON.stringify(item.body, null, 2) };
}

const EMPTY: Draft = { id: "word:", kind: "word", level: "A1", topic: "", sort: "0", body: "{}" };

/** The body of the first item of `kind`, as an example to start a new one from (AC-016). */
async function exampleBody(kind: ContentKind): Promise<string> {
  const { items } = await fetchContent({ kind, page: 1 });
  const first = items.find((item) => !item.deleted);
  if (!first) return "{}";
  return JSON.stringify((await fetchContentItem(first.id)).item.body, null, 2);
}

interface EditorFormProps {
  target: NonNullable<EditorTarget>;
  item: AdminContentItem | null;
  /** For a new item: the example body it starts from. */
  example?: string;
  onDone: () => void;
}

function EditorForm({ target, item, example, onDone }: EditorFormProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(item ? draftOf(item) : { ...EMPTY, body: example ?? EMPTY.body });
  const [issues, setIssues] = useState<ItemIssue[]>([]);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const readOnly = item !== null && READ_ONLY_KINDS.includes(item.kind);

  const save = useMutation({
    mutationFn: saveContentItem,
    onSuccess: ({ item: saved }) => {
      toast.success(target.create ? `Đã thêm ${saved.id}.` : `Đã lưu ${saved.id}. Người học sẽ thấy ngay.`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
      onDone();
    },
    onError: (error) => {
      setIssues(error instanceof AdminError ? error.issues : []);
      toast.error(error.message);
    },
  });
  const remove = useMutation({
    mutationFn: (removed: boolean) => setContentRemoved(draft.id, removed),
    onSuccess: (_result, removed) => {
      toast.success(removed ? `Đã xóa ${draft.id}.` : `Đã khôi phục ${draft.id}.`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
      onDone();
    },
    onError: (error) => toast.error(error.message),
  });

  function update(change: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...change }));
  }

  async function handleKindChange(value: unknown) {
    const kind = value as ContentKind;
    update({ kind, id: `${kind}:${draft.id.replace(/^[a-z]+:/, "")}` });
    try {
      update({ body: await exampleBody(kind) });
    } catch {
      // Keep the current body; the admin can still type one.
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let body: unknown;
    try {
      body = JSON.parse(draft.body);
    } catch (error) {
      setJsonError(`JSON không hợp lệ: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    setJsonError(null);
    setIssues([]);
    save.mutate({
      create: target.create,
      item: { id: draft.id.trim(), kind: draft.kind, level: draft.level, topic: draft.topic.trim() || null, sort: Number.parseInt(draft.sort, 10) || 0, body },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{target.create ? "Thêm mục mới" : draft.id}</DialogTitle>
        <DialogDescription>
          {readOnly
            ? "Loại nội dung này chỉ xem được ở đây; hãy sửa bằng các script nội dung."
            : "Thay đổi có hiệu lực ngay. Sau đó chạy pnpm content:pull để đưa vào mã nguồn."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        {target.create ? (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="item-kind">Loại</Label>
              <Select items={KIND_ITEMS} value={draft.kind} onValueChange={handleKindChange}>
                <SelectTrigger id="item-kind" className="w-full data-[size=default]:h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {EDITABLE_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind} className="min-h-10">
                      {KIND_LABELS[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-id">Mã</Label>
              <Input id="item-id" value={draft.id} onChange={(event) => update({ id: event.target.value })} className="h-11 font-mono" required />
            </div>
          </>
        ) : null}
        <div className="grid gap-1.5">
          <Label htmlFor="item-level">Trình độ</Label>
          <Select items={LEVEL_ITEMS} value={draft.level} onValueChange={(value) => update({ level: value as Level })} disabled={readOnly}>
            <SelectTrigger id="item-level" className="w-full data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {LEVELS.map((level) => (
                <SelectItem key={level} value={level} className="min-h-10">
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="item-topic">Chủ đề</Label>
            <Input id="item-topic" value={draft.topic} onChange={(event) => update({ topic: event.target.value })} className="h-11" disabled={readOnly} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="item-sort">Thứ tự</Label>
            <Input id="item-sort" inputMode="numeric" value={draft.sort} onChange={(event) => update({ sort: event.target.value })} className="h-11 tabular-nums" disabled={readOnly} />
          </div>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="item-body">Nội dung (JSON)</Label>
        <Textarea
          id="item-body"
          value={draft.body}
          onChange={(event) => update({ body: event.target.value })}
          spellCheck={false}
          readOnly={readOnly}
          aria-invalid={jsonError !== null || issues.length > 0}
          aria-describedby="item-body-errors"
          className="min-h-72 font-mono text-sm"
        />
        <div id="item-body-errors" aria-live="polite" className="grid gap-1">
          {jsonError ? <p className="text-sm text-destructive">{jsonError}</p> : null}
          {issues.length > 0 ? (
            <ul className="grid gap-0.5 text-sm text-destructive">
              {issues.map((issue) => (
                <li key={`${issue.path}:${issue.message}`}>
                  <code>{issue.path || "(mục)"}</code>: {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {readOnly ? null : (
        <DialogFooter className="gap-2 sm:justify-between">
          {target.create || !item ? (
            <span />
          ) : item.deleted ? (
            <Button type="button" variant="outline" className="h-11 gap-1.5" disabled={remove.isPending} onClick={() => remove.mutate(false)}>
              <RotateCcw aria-hidden /> Khôi phục
            </Button>
          ) : (
            <Button type="button" variant="outline" className="h-11 gap-1.5 text-destructive" disabled={remove.isPending} onClick={() => setConfirmRemove(true)}>
              <Trash2 aria-hidden /> Xóa
            </Button>
          )}
          <Button type="submit" className="h-11" disabled={save.isPending}>
            {save.isPending ? "Đang lưu…" : target.create ? "Thêm" : "Lưu"}
          </Button>
        </DialogFooter>
      )}

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa {draft.id}?</AlertDialogTitle>
            <AlertDialogDescription>Người học sẽ không thấy mục này nữa, nhưng vẫn giữ tiến độ đã học. Bạn có thể khôi phục lại sau.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ lại</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate(true)}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

export function ContentEditor({ target, onClose }: { target: EditorTarget; onClose: () => void }) {
  const editing = target && !target.create ? target.id : null;
  const item = useQuery({ queryKey: ["admin", "content", "item", editing], queryFn: () => fetchContentItem(editing!), enabled: editing !== null, retry: false });
  const creating = target?.create === true;
  const example = useQuery({ queryKey: ["admin", "content", "example", EMPTY.kind], queryFn: () => exampleBody(EMPTY.kind), enabled: creating, retry: false, staleTime: Infinity });

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  return (
    <Dialog open={target !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
        {target === null ? null : target.create ? (
          example.isPending ? (
            <>
              <DialogTitle className="sr-only">Đang tải</DialogTitle>
              <p role="status" className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 aria-hidden className="size-4 animate-spin" /> Đang tải…
              </p>
            </>
          ) : (
            <EditorForm key="new" target={target} item={null} example={example.data} onDone={onClose} />
          )
        ) : item.data ? (
          <EditorForm key={item.data.item.id} target={target} item={item.data.item} onDone={onClose} />
        ) : item.error ? (
          <>
            <DialogTitle>Không mở được mục này</DialogTitle>
            <p className="text-destructive">{item.error.message}</p>
          </>
        ) : (
          <>
            <DialogTitle className="sr-only">Đang tải</DialogTitle>
            <p role="status" className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" /> Đang tải…
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
