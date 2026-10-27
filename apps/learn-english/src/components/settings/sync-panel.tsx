"use client";

import { useState, type FormEvent } from "react";
import { Copy, KeyRound, RefreshCw, ShieldAlert, Trash2, TriangleAlert, Unlink } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/use-profile";
import type { SyncState } from "@/learning/types";
import {
  deleteSyncedData,
  linkSync,
  previewSync,
  SyncError,
  syncNow,
  turnOnSync,
  unlinkSync,
  type SyncPreview,
} from "@/sync/sync-client";
import { formatDateTime } from "./backup-actions";

const FALLBACK_ERROR = "Đã có lỗi xảy ra. Bạn thử lại nhé.";
const BUTTON = "h-11 px-4";

function errorMessage(error: unknown): string {
  return error instanceof SyncError ? error.message : FALLBACK_ERROR;
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    toast.success("Đã sao chép mã đồng bộ.");
  } catch {
    toast.error("Chưa sao chép được. Bạn hãy chọn mã rồi sao chép thủ công nhé.");
  }
}

function Warning() {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      Ai có mã đồng bộ đều xem và thay đổi được tiến độ này. Bạn hãy giữ mã như mật khẩu, đừng chia sẻ cho người khác.
    </p>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

/** Sync with a code: turn on, link another device, sync now, unlink, delete (AC-047–AC-051). */
export function SyncPanel() {
  const profile = useProfile();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Runs one action with the busy flag and the inline error. */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const sync = profile.status === "ready" ? profile.data.sync : undefined;

  return (
    <Card id="dong-bo">
      <CardHeader>
        <CardTitle>Đồng bộ</CardTitle>
        <CardDescription>Dùng một mã để giữ tiến độ giống nhau trên nhiều thiết bị, không cần tài khoản.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {profile.status !== "ready" ? (
          <Skeleton className="h-24 w-full" />
        ) : sync ? (
          <SyncOn sync={sync} busy={busy} run={run} />
        ) : (
          <SyncOff busy={busy} run={run} />
        )}
        {error ? <ErrorNote message={error} /> : null}
      </CardContent>
    </Card>
  );
}

interface ActionProps {
  busy: boolean;
  run: (action: () => Promise<void>) => Promise<void>;
}

function SyncOff({ busy, run }: ActionProps) {
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<SyncPreview | null>(null);

  function handleTurnOn() {
    return run(async () => {
      await turnOnSync();
      toast.success("Đã bật đồng bộ. Bạn hãy lưu mã để dùng trên thiết bị khác.");
    });
  }

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return run(async () => setPreview(await previewSync(input)));
  }

  function handleLink() {
    if (!preview) return;
    const { code } = preview;
    return run(async () => {
      try {
        await linkSync(code);
      } finally {
        // Closed either way, so an error shows in the panel instead of behind the dialog.
        setPreview(null);
      }
      setInput("");
      toast.success("Đã liên kết thiết bị. Tiến độ sẽ được đồng bộ từ bây giờ.");
    });
  }

  function handlePreviewOpenChange(open: boolean) {
    if (!open) setPreview(null);
  }

  return (
    <>
      <Warning />
      <div>
        <Button size="lg" className={BUTTON} onClick={handleTurnOn} disabled={busy}>
          <RefreshCw aria-hidden /> Bật đồng bộ
        </Button>
      </div>
      <Separator />
      <form className="grid gap-2" onSubmit={handlePreview}>
        <Label htmlFor="sync-code-input">Nhập mã đồng bộ</Label>
        <p className="text-sm text-muted-foreground">Đã bật đồng bộ ở thiết bị khác? Nhập mã ở đó để dùng chung tiến độ.</p>
        <div className="flex flex-wrap gap-2">
          <Input
            id="sync-code-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="XXXX-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="h-11 max-w-56 font-mono uppercase tracking-wider"
          />
          <Button type="submit" size="lg" variant="outline" className={BUTTON} disabled={busy || input.trim() === ""}>
            <KeyRound aria-hidden /> Kiểm tra mã
          </Button>
        </div>
      </form>

      <AlertDialog open={preview !== null} onOpenChange={handlePreviewOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liên kết với tiến độ này?</AlertDialogTitle>
            <AlertDialogDescription>
              Tiến độ trên thiết bị này sẽ được gộp với tiến độ đã đồng bộ. Không câu trả lời hay ngày học nào bị mất.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {preview ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-muted px-4 py-3 text-sm">
              <dt className="text-muted-foreground">Từ đã học</dt>
              <dd>{preview.summary.wordsLearned}</dd>
              <dt className="text-muted-foreground">Điểm</dt>
              <dd>{preview.summary.points}</dd>
              <dt className="text-muted-foreground">Cập nhật lần cuối</dt>
              <dd>{formatDateTime(preview.updatedAt)}</dd>
            </dl>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleLink} disabled={busy}>
              Liên kết
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SyncOn({ sync, busy, run }: ActionProps & { sync: SyncState }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSyncNow() {
    return run(async () => {
      await syncNow();
      toast.success("Đã đồng bộ.");
    });
  }

  function handleUnlink() {
    return run(async () => {
      await unlinkSync();
      toast.success("Đã tắt đồng bộ trên thiết bị này. Tiến độ vẫn còn trên máy.");
    });
  }

  function handleDelete() {
    return run(async () => {
      await deleteSyncedData();
      setConfirmDelete(false);
      toast.success("Đã xóa dữ liệu đồng bộ trên máy chủ.");
    });
  }

  return (
    <>
      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground">Mã đồng bộ của bạn</p>
        <div className="flex flex-wrap items-center gap-2">
          <output aria-label="Mã đồng bộ" className="rounded-lg border px-3 py-2 font-mono text-lg tracking-wider select-all">
            {sync.code}
          </output>
          <Button size="lg" variant="outline" className={BUTTON} onClick={() => copyCode(sync.code)}>
            <Copy aria-hidden /> Sao chép mã
          </Button>
        </div>
      </div>
      <Warning />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {sync.dirty
          ? "Có thay đổi chưa đồng bộ được. Ứng dụng sẽ tự thử lại khi có mạng."
          : sync.lastSyncedAt
            ? `Lần đồng bộ gần nhất: ${formatDateTime(sync.lastSyncedAt)}`
            : "Chưa đồng bộ lần nào."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" className={BUTTON} onClick={handleSyncNow} disabled={busy}>
          <RefreshCw aria-hidden /> Đồng bộ ngay
        </Button>
        <Button size="lg" variant="outline" className={BUTTON} onClick={handleUnlink} disabled={busy}>
          <Unlink aria-hidden /> Tắt đồng bộ trên thiết bị này
        </Button>
        <Button size="lg" variant="destructive" className={BUTTON} onClick={() => setConfirmDelete(true)} disabled={busy}>
          <Trash2 aria-hidden /> Xóa dữ liệu đã đồng bộ
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa dữ liệu đã đồng bộ?</AlertDialogTitle>
            <AlertDialogDescription>
              Bản tiến độ trên máy chủ sẽ bị xóa và mã này không dùng được nữa. Các thiết bị khác vẫn giữ tiến độ của mình, nhưng
              sẽ không đồng bộ với nhau nữa. Tiến độ trên thiết bị này vẫn còn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={busy}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
