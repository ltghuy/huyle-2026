"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, RotateCcw, TriangleAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import type { Snapshot } from "@/learning/snapshot";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/use-profile";
import { resetAll } from "@/storage/replace";
import { applySnapshot, exportProgress, formatDate, formatDateTime, IMPORT_ERRORS, readBackupFile } from "./backup-actions";

const EXPORT_FAILED = "Chưa xuất được tiến độ. Bạn thử lại nhé.";

/** Export, import (summary + confirm) and reset (confirm + export suggestion): AC-042–AC-044. */
export function BackupPanel() {
  const profile = useProfile();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pending, setPending] = useState<Snapshot | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      await exportProgress(Date.now());
      toast.success("Đã tải file sao lưu về máy.");
    } catch {
      toast.error(EXPORT_FAILED);
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared so picking the same file again still fires a change.
    event.target.value = "";
    if (!file) return;
    const result = await readBackupFile(file);
    if (result.ok) {
      setImportError(null);
      setPending(result.snapshot);
    } else {
      setImportError(IMPORT_ERRORS[result.reason]);
    }
  }

  async function handleConfirmImport() {
    if (!pending) return;
    setBusy(true);
    try {
      await applySnapshot(pending);
      setPending(null);
      toast.success("Đã nhập tiến độ từ file sao lưu.");
    } catch {
      toast.error("Chưa nhập được tiến độ. Tiến độ hiện tại của bạn vẫn giữ nguyên.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmReset() {
    setBusy(true);
    try {
      await resetAll(Date.now());
      setConfirmReset(false);
      toast.success("Đã đặt lại tiến độ. Mình bắt đầu lại từ đầu nhé!");
    } catch {
      toast.error("Chưa đặt lại được tiến độ. Bạn thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }

  function handleImportOpenChange(open: boolean) {
    if (!open) setPending(null);
  }

  return (
    <Card id="sao-luu">
      <CardHeader>
        <CardTitle>Sao lưu tiến độ</CardTitle>
        <CardDescription>
          Tiến độ chỉ được lưu trên trình duyệt này. Bạn hãy xuất ra file để giữ an toàn hoặc chuyển sang máy khác.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="text-sm text-muted-foreground">
          {profile.status === "ready" ? (
            profile.data.lastBackupAt ? (
              `Lần sao lưu gần nhất: ${formatDate(profile.data.lastBackupAt)}`
            ) : (
              "Bạn chưa sao lưu lần nào."
            )
          ) : (
            <Skeleton className="h-5 w-48" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" className="h-11 px-4" onClick={handleExport} disabled={busy}>
            <Download aria-hidden /> Xuất tiến độ
          </Button>
          <Button size="lg" variant="outline" className="h-11 px-4" onClick={() => fileInput.current?.click()} disabled={busy}>
            <Upload aria-hidden /> Nhập tiến độ
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            tabIndex={-1}
            aria-label="Chọn file sao lưu"
            onChange={handleFileChange}
          />
          <Button size="lg" variant="destructive" className="h-11 px-4" onClick={() => setConfirmReset(true)} disabled={busy}>
            <RotateCcw aria-hidden /> Đặt lại tiến độ
          </Button>
        </div>
        {importError ? (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {importError}
          </p>
        ) : null}
      </CardContent>

      <AlertDialog open={pending !== null} onOpenChange={handleImportOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nhập file sao lưu này?</AlertDialogTitle>
            <AlertDialogDescription>Tiến độ hiện tại trên trình duyệt này sẽ được thay bằng dữ liệu trong file.</AlertDialogDescription>
          </AlertDialogHeader>
          {pending ? <SnapshotSummary snapshot={pending} /> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} disabled={busy}>
              Thay tiến độ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đặt lại toàn bộ tiến độ?</AlertDialogTitle>
            <AlertDialogDescription>
              Mọi từ đã học, điểm, chuỗi ngày học và lịch ôn tập trên trình duyệt này sẽ bị xóa và không lấy lại được. Bạn nên
              xuất tiến độ ra file trước để phòng khi cần.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            <Button variant="outline" onClick={handleExport} disabled={busy}>
              <Download aria-hidden /> Xuất trước
            </Button>
            <AlertDialogAction variant="destructive" onClick={handleConfirmReset} disabled={busy}>
              Xóa hết
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SnapshotSummary({ snapshot }: { snapshot: Snapshot }) {
  const { summary } = snapshot;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-muted px-4 py-3 text-sm">
      <dt className="text-muted-foreground">Ngày xuất</dt>
      <dd>{formatDateTime(snapshot.exportedAt)}</dd>
      <dt className="text-muted-foreground">Từ đã học</dt>
      <dd>{summary.wordsLearned}</dd>
      <dt className="text-muted-foreground">Điểm</dt>
      <dd>{summary.points}</dd>
      <dt className="text-muted-foreground">Chuỗi ngày học</dt>
      <dd>{summary.streak} ngày</dd>
    </dl>
  );
}
