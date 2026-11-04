"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
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
import { useAccount } from "@/hooks/use-account";
import { exportProgress } from "./backup-actions";
import { useLeaveAccount } from "./use-leave-account";

async function handleExport() {
  try {
    await exportProgress(Date.now());
    toast.success("Đã tải file sao lưu về máy.");
  } catch {
    toast.error("Chưa xuất được file sao lưu. Bạn thử lại nhé.");
  }
}

/**
 * Deleting the account (feature 022, AC-022, AC-023), at the end of Settings so it sits apart from
 * everyday settings. Shown only while signed in, or with an expired session on this device.
 */
export function DeleteAccount() {
  const { status } = useAccount();
  const leaveAccount = useLeaveAccount();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (status !== "signed-in" && status !== "expired") return null;

  async function handleDelete() {
    setBusy(true);
    const response = await fetch("/api/account", { method: "DELETE", credentials: "same-origin" }).catch(() => null);
    if (!response?.ok) {
      setBusy(false);
      toast.error("Chưa xóa được tài khoản. Bạn kiểm tra mạng rồi thử lại nhé.");
      return;
    }
    await leaveAccount("Đã xóa tài khoản và toàn bộ tiến độ.");
    setOpen(false);
    setBusy(false);
  }

  return (
    <div>
      <Button variant="destructive" size="lg" className="h-11 w-full px-4" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden /> Xóa tài khoản
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tài khoản?</AlertDialogTitle>
            <AlertDialogDescription>
              Tài khoản và toàn bộ tiến độ (từ đã học, lịch ôn tập, chuỗi ngày học, điểm) sẽ bị xóa khỏi máy chủ và thiết bị này, không lấy lại được. Bạn nên xuất
              tiến độ ra file trước.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            <Button variant="outline" onClick={handleExport} disabled={busy}>
              <Download aria-hidden /> Xuất trước
            </Button>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={busy}>
              Xóa tài khoản
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
