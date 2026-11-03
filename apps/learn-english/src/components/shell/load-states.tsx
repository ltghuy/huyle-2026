import { RotateCcw } from "lucide-react";
import { Owl, type OwlMood } from "@/components/mascot/owl";
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
    <div role="alert" className="mx-4 flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-10 text-center md:mx-8">
      <Owl mood="sleepy" size={72} />
      <p>Chưa tải được nội dung. Bạn kiểm tra kết nối mạng rồi thử lại nhé.</p>
      <Button variant="outline" onClick={onRetry}>
        <RotateCcw aria-hidden /> Thử lại
      </Button>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  children?: React.ReactNode;
  /** The owl in this mood instead of the icon, on a soft panel (feature 020). */
  mood?: OwlMood;
  icon?: React.ComponentType<{ className?: string }>;
}

export function EmptyState({ icon: Icon, mood, title, children }: EmptyStateProps) {
  if (mood) {
    return (
      <div className="mx-4 flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-10 text-center md:mx-8">
        <Owl mood={mood} size={72} />
        <p className="text-lg font-semibold">{title}</p>
        {children}
      </div>
    );
  }
  return (
    <div className="mx-4 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center md:mx-8">
      {Icon ? <Icon className="size-8 text-muted-foreground" /> : null}
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}
