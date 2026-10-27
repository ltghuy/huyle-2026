import { CloudOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder rows sized like list content, so nothing jumps when it loads. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3 px-4 md:px-8" aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

export function ContentError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="mx-4 flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center md:mx-8">
      <CloudOff className="size-8 text-muted-foreground" aria-hidden />
      <p>Chưa tải được nội dung. Bạn kiểm tra kết nối mạng rồi thử lại nhé.</p>
      <Button variant="outline" onClick={onRetry}>
        <RotateCcw aria-hidden /> Thử lại
      </Button>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-4 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center md:mx-8">
      <Icon className="size-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}
