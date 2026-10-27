"use client";

import { useState } from "react";
import { Download, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ensureProfile } from "@/hooks/use-profile";
import { useStorageQuery } from "@/hooks/use-storage-query";
import { getAllCards } from "@/storage/cards";
import { exportProgress, needsBackupReminder } from "./backup-actions";

const DISMISS_KEY = "learn-english:backup-reminder-dismissed";
const STORES = ["meta", "cards"] as const;

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Private modes may block storage; the banner then stays hidden for this page view only.
  }
}

async function loadReminder(): Promise<boolean> {
  if (wasDismissed()) return false;
  const [profile, cards] = await Promise.all([ensureProfile(), getAllCards()]);
  return needsBackupReminder(profile, cards.length, Date.now());
}

/**
 * Gentle reminder to export when there is progress and no backup for 14 days
 * (sync off). Dismissed for the rest of the browser session. Reusable on any page.
 */
export function BackupReminder({ className }: { className?: string }) {
  const query = useStorageQuery(loadReminder, STORES);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (query.status !== "ready" || !query.data || dismissed) return null;

  function handleDismiss() {
    rememberDismissed();
    setDismissed(true);
  }

  async function handleExport() {
    setBusy(true);
    try {
      await exportProgress(Date.now());
      toast.success("Đã tải file sao lưu về máy.");
    } catch {
      toast.error("Chưa xuất được tiến độ. Bạn thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="status" className={className}>
      <div className="flex items-start gap-3 rounded-xl border border-streak/40 bg-card px-4 py-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-streak" aria-hidden />
        <div className="grid flex-1 gap-2">
          <p className="text-sm">
            Đã hơn 14 ngày bạn chưa sao lưu tiến độ. Xuất ra file để không mất những gì đã học nếu trình duyệt bị xóa dữ liệu nhé.
          </p>
          <div>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={busy}>
              <Download aria-hidden /> Xuất tiến độ
            </Button>
          </div>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={handleDismiss} aria-label="Ẩn lời nhắc">
          <X aria-hidden />
        </Button>
      </div>
    </div>
  );
}
