import { DatabaseZap, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Error state for a failed read of learner progress from browser storage. */
export function StorageError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="mx-4 flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center md:mx-8">
      <DatabaseZap className="size-8 text-muted-foreground" aria-hidden />
      <p>Chưa đọc được tiến độ của bạn trên trình duyệt này.</p>
      <Button variant="outline" onClick={onRetry}>
        <RotateCcw aria-hidden /> Thử lại
      </Button>
    </div>
  );
}
