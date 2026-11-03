"use client";

import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { NameForm } from "@/components/name/name-form";
import { useAccount } from "@/hooks/use-account";
import { useProfile } from "@/hooks/use-profile";

function handleSaved(name: string) {
  toast.success(name ? `Đã lưu tên gọi: ${name}.` : "Đã bỏ tên gọi. Ứng dụng sẽ gọi bạn theo tên Google.");
}

/**
 * Change the learner's name (AC-007). Signed in (feature 022), the Google name is used unless the
 * learner picks another one here, so the field may be left empty.
 */
export function NameSetting() {
  const profile = useProfile();
  const { account } = useAccount();
  if (profile.status !== "ready") return <Skeleton className="h-11 w-full max-w-sm" />;
  return (
    <div className="grid gap-2">
      <NameForm
        key={profile.data.displayName ?? ""}
        id="name-setting-input"
        label={account ? "Tên gọi (không bắt buộc)" : "Tên của bạn"}
        initialName={profile.data.displayName}
        submitLabel="Lưu tên"
        onSaved={handleSaved}
        optional={account !== null}
      />
      <p className="text-sm text-muted-foreground">
        {account
          ? `Để trống thì ứng dụng gọi bạn theo tên Google (${account.name}). Tên gọi cũng được ghi lên chứng nhận và hiện trên bảng xếp hạng nếu bạn tham gia.`
          : "Ứng dụng dùng tên này để chào bạn và sẽ ghi lên chứng nhận sau này."}
      </p>
    </div>
  );
}
