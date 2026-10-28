import { CheckCircle2, ListChecks, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { RunnerScore } from "@/components/exercise/exercise-runner";

interface ScoreScreenProps {
  title: string;
  score: RunnerScore;
  onRetry: () => void;
  onDone: () => void;
  doneLabel?: string;
}

function encouragement({ correct, total }: ScoreScreenProps["score"]): string {
  if (total === 0) return "Bạn đã xem hết bài.";
  const ratio = correct / total;
  if (ratio === 1) return "Tuyệt vời, bạn làm đúng hết!";
  if (ratio >= 0.7) return "Làm tốt lắm! Các câu sai sẽ quay lại trong phần Ôn tập.";
  return "Không sao, các câu sai sẽ quay lại trong phần Ôn tập để bạn luyện thêm.";
}

/** Result of a finished exercise set (AC-029). */
export function ScoreScreen({ title, score, onRetry, onDone, doneLabel = "Về danh sách" }: ScoreScreenProps) {
  const percent = score.total ? Math.round((score.correct / score.total) * 100) : 100;
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center gap-6 px-4 py-10 text-center">
      <CheckCircle2 className="mx-auto size-14 text-success" aria-hidden />
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold">Hoàn thành bài tập</h2>
        <p className="text-muted-foreground">{title}</p>
      </div>
      <div className="grid gap-3 rounded-xl border p-6" role="status">
        <p className="text-4xl font-semibold tabular-nums">
          {score.correct}/{score.total}
        </p>
        <p className="text-sm text-muted-foreground">câu đúng</p>
        <Progress value={percent} aria-label={`Đúng ${percent}%`} />
        <p>{encouragement(score)}</p>
        {score.corrected ? (
          <p className="text-sm text-muted-foreground">
            Bạn đã làm lại và sửa đúng cả {score.corrected} câu sai. Điểm trên là kết quả lần đầu.
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="outline" size="lg" className="h-12 text-base" onClick={onRetry}>
          <RotateCcw aria-hidden /> Làm lại
        </Button>
        <Button size="lg" className="h-12 text-base" onClick={onDone}>
          <ListChecks aria-hidden /> {doneLabel}
        </Button>
      </div>
    </div>
  );
}
