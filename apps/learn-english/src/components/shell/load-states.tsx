import { RotateCcw } from "lucide-react";
import { Mascot, type MascotMood } from "@/components/mascot/mascot";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Each state sits inside the page gutter by default; a page that already has its own gutter
// passes `className` to drop the inset (quick 071).

/** Placeholder rows sized like list content, so nothing jumps when it loads. */
export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3 px-4 md:px-8", className)} aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

export function ContentError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("mx-4 flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-10 text-center md:mx-8", className)}>
      <Mascot mood="sleepy" size={72} />
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
  /** The cat in this mood instead of the icon, on a soft panel (feature 020). */
  mood?: MascotMood;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function EmptyState({ icon: Icon, mood, title, children, className }: EmptyStateProps) {
  if (mood) {
    return (
      <div className={cn("mx-4 flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-10 text-center md:mx-8", className)}>
        <Mascot mood={mood} size={72} />
        <p className="text-lg font-semibold">{title}</p>
        {children}
      </div>
    );
  }
  return (
    <div className={cn("mx-4 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center md:mx-8", className)}>
      {Icon ? <Icon className="size-8 text-muted-foreground" /> : null}
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}
