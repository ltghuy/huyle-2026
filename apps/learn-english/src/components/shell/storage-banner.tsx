"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { isStorageAvailable } from "@/storage/db";

/** Warns when the browser won't keep progress (some private modes). */
export function StorageBanner() {
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    void isStorageAvailable().then((available) => {
      if (active) setUnavailable(!available);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!unavailable) return null;
  return (
    <div role="status" className="flex items-start gap-2 border-b bg-muted px-4 py-2 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-streak" aria-hidden />
      <p>
        Trình duyệt này không cho lưu dữ liệu, nên tiến độ sẽ mất khi bạn đóng trang. Hãy xuất bản sao lưu hoặc bật
        đồng bộ trong Cài đặt trước khi rời đi.
      </p>
    </div>
  );
}
