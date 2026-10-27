"use client";

import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { NameForm } from "@/components/name/name-form";
import { useProfile } from "@/hooks/use-profile";

function handleSaved(name: string) {
  toast.success(`Đã lưu tên: ${name}.`);
}

/** Change the learner's name (AC-007). */
export function NameSetting() {
  const profile = useProfile();
  if (profile.status !== "ready") return <Skeleton className="h-11 w-full max-w-sm" />;
  return (
    <div className="grid gap-2">
      <NameForm
        key={profile.data.displayName ?? ""}
        id="name-setting-input"
        label="Tên của bạn"
        initialName={profile.data.displayName}
        submitLabel="Lưu tên"
        onSaved={handleSaved}
      />
      <p className="text-sm text-muted-foreground">Ứng dụng dùng tên này để chào bạn và sẽ ghi lên chứng nhận sau này.</p>
    </div>
  );
}
