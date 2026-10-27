"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GraduationCap, X } from "lucide-react";
import type { ContentItemOf } from "@/content/schema";
import { loadContent } from "@/content/client";
import { createRng, shuffle } from "@/learning/exercises/random";
import { isFinished, itemsAnswered, MAX_ITEMS, nextLevel, recordAnswer, result, startPlacement, type PlacementState } from "@/learning/placement";
import type { Level } from "@/learning/types";
import { updateProfile } from "@/storage/meta";
import { OptionList } from "@/components/exercise/option-list";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ContentError, ListSkeleton } from "@/components/shell/load-states";

type PlacementItem = ContentItemOf<"placement">;

const LEVEL_TEXT: Record<Level, string> = {
  A1: "Bạn mới bắt đầu. Ứng dụng sẽ đi cùng bạn từ những từ và câu đơn giản nhất.",
  A2: "Bạn đã biết những điều cơ bản. Mình sẽ mở rộng vốn từ cho các tình huống hằng ngày.",
  B1: "Bạn giao tiếp được trong nhiều tình huống quen thuộc. Mình sẽ luyện thêm từ vựng và các thì phức tạp hơn.",
  B2: "Bạn dùng tiếng Anh khá tự tin. Mình sẽ tập trung vào từ vựng học thuật và cấu trúc nâng cao.",
  C1: "Bạn ở trình độ cao. Mình sẽ luyện những từ và cấu trúc tinh tế để bạn dùng tiếng Anh tự nhiên hơn.",
};

type Phase = { name: "intro" } | { name: "testing"; state: PlacementState; item: PlacementItem } | { name: "result"; level: Level };

/** First-visit placement test (AC-019–AC-021): skippable, at most 30 questions. */
export function PlacementTest() {
  const router = useRouter();
  const [items, setItems] = useState<PlacementItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: "intro" });
  const [selected, setSelected] = useState<number | null>(null);
  const [used, setUsed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    loadContent("placement").then(
      (loaded) => active && setItems(loaded.items),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, []);

  // Each level's questions in a fixed shuffled order, so a retake isn't identical but a reload is.
  const byLevel = useMemo(() => {
    const groups = new Map<Level, PlacementItem[]>();
    for (const item of items ?? []) groups.set(item.level, [...(groups.get(item.level) ?? []), item]);
    for (const [level, group] of groups) groups.set(level, shuffle(group, createRng(group.length * 7919 + level.charCodeAt(1))));
    return groups;
  }, [items]);

  function nextItem(state: PlacementState, taken: Set<string>): PlacementItem | undefined {
    return byLevel.get(nextLevel(state))?.find((item) => !taken.has(item.id));
  }

  async function finish(level: Level) {
    await updateProfile({ level, placement: "done", placementResult: level }, Date.now());
    setPhase({ name: "result", level });
  }

  async function handleSkip() {
    await updateProfile({ level: "A1", placement: "skipped" }, Date.now());
    router.replace("/");
  }

  function handleStart() {
    const state = startPlacement();
    const item = nextItem(state, used);
    if (item) setPhase({ name: "testing", state, item });
    else void finish("A1");
  }

  function handleNext() {
    if (phase.name !== "testing" || selected === null) return;
    const taken = new Set(used).add(phase.item.id);
    const state = recordAnswer(phase.state, selected === phase.item.body.answerIndex);
    setUsed(taken);
    setSelected(null);
    const item = isFinished(state) ? undefined : nextItem(state, taken);
    // Out of questions at this level (small content set): stop with what we know.
    if (!item) void finish(result(state));
    else setPhase({ name: "testing", state, item });
  }

  if (failed) return <div className="pt-16"><ContentError onRetry={() => window.location.reload()} /></div>;

  if (phase.name === "intro") {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-6">
        <GraduationCap className="size-12 text-primary" aria-hidden />
        <h1 className="text-2xl font-semibold">Chào bạn! Mình kiểm tra trình độ nhé?</h1>
        <p className="text-lg text-muted-foreground">
          Khoảng 20 câu hỏi ngắn, dưới 10 phút. Kết quả giúp ứng dụng chọn từ vựng và ngữ pháp vừa sức với bạn.
        </p>
        <div className="grid gap-3">
          <Button size="lg" className="h-12 text-base" onClick={handleStart} disabled={!items}>
            Bắt đầu kiểm tra
          </Button>
          <Button size="lg" variant="ghost" className="h-12 text-base" onClick={handleSkip}>
            Bỏ qua, học từ trình độ A1
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Bạn có thể làm lại bài kiểm tra bất cứ lúc nào trong Cài đặt.</p>
      </main>
    );
  }

  if (phase.name === "result") {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-6 text-center">
        <p className="text-muted-foreground">Trình độ của bạn</p>
        <p className="text-6xl font-bold text-primary">{phase.level}</p>
        <p className="text-lg">{LEVEL_TEXT[phase.level]}</p>
        <Button size="lg" className="h-12 text-base" onClick={() => router.replace("/")}>
          Bắt đầu học
        </Button>
      </main>
    );
  }

  if (!items) return <ListSkeleton rows={3} />;
  const answered = itemsAnswered(phase.state);
  const { body } = phase.item;
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon-lg" onClick={handleSkip} aria-label="Bỏ qua bài kiểm tra">
          <X aria-hidden />
        </Button>
        <Progress value={(answered / MAX_ITEMS) * 100} className="flex-1" aria-label="Tiến độ" />
        <span className="text-sm text-muted-foreground tabular-nums">Câu {answered + 1}</span>
      </header>
      <main className="mx-auto grid w-full max-w-xl flex-1 content-start gap-6 px-4 py-6">
        <h2 className="text-lg font-medium text-muted-foreground">
          {body.kind === "meaning-mcq" ? "Chọn nghĩa đúng của từ" : "Chọn đáp án đúng"}
        </h2>
        <p className="text-center text-3xl font-semibold" lang="en">
          {body.prompt}
        </p>
        <OptionList
          label="Các lựa chọn"
          options={body.options}
          selected={selected}
          onSelect={setSelected}
          lang={body.kind === "meaning-mcq" ? "vi" : "en"}
        />
      </main>
      <div className="sticky bottom-0 border-t bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button size="lg" className="mx-auto flex h-12 w-full max-w-xl text-base" disabled={selected === null} onClick={handleNext}>
          Câu tiếp theo
        </Button>
      </div>
    </div>
  );
}
