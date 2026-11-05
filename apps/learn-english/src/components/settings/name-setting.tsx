"use client";

import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { NameForm } from "@/components/name/name-form";
import { useAccount } from "@/hooks/use-account";
import { useProfile } from "@/hooks/use-profile";

function savedMessage(name: string, googleName: string | undefined) {
  if (name) return `Đã lưu tên gọi: ${name}.`;
  return googleName ? "Đã bỏ tên gọi. Ứng dụng sẽ gọi bạn theo tên Google." : "Đã bỏ tên gọi.";
}

/**
 * Change the learner's name (AC-007). The name is optional for everyone (quick 051): signed in
 * (feature 022) the Google name is used unless the learner picks another one, and a guest is
 * called "bạn".
 */
export function NameSetting() {
  const profile = useProfile();
  const { account } = useAccount();

  function handleSaved(name: string) {
    toast.success(savedMessage(name, account?.name));
  }

  if (profile.status !== "ready") return <Skeleton className="h-11 w-full max-w-sm" />;
  return (
    <div className="grid gap-2">
      <NameForm
        key={profile.data.displayName ?? ""}
        id="name-setting-input"
        label="Tên gọi (không bắt buộc)"
        initialName={profile.data.displayName}
        submitLabel="Lưu tên"
        onSaved={handleSaved}
        optional
      />
      <p className="text-sm text-muted-foreground">
        {account
          ? `Để trống thì ứng dụng gọi bạn theo tên Google (${account.name}). Tên gọi cũng được ghi lên chứng nhận và hiện trên bảng xếp hạng nếu bạn tham gia.`
          : "Ứng dụng dùng tên này để chào bạn và ghi lên chứng nhận. Để trống thì ứng dụng gọi bạn là “bạn”."}
      </p>
    </div>
  );
}
