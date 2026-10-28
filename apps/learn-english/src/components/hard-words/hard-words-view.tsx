"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Clock, Dumbbell, PartyPopper, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentError, EmptyState, ListSkeleton } from "@/components/shell/load-states";
import { StorageError } from "@/components/settings/storage-error";
import type { RunnerStep } from "@/components/exercise/exercise-runner";
import { levelsFor, useContentIndex } from "@/hooks/use-content-index";
import { useProfile } from "@/hooks/use-profile";
import { useStorageQuery } from "@/hooks/use-storage-query";
import { getAllAttempts } from "@/storage/attempts";
import { hardWordRows, practiceSteps, PRACTICE_LIMIT, REASON_LABELS, type HardWordRow } from "./hard-word-list";

// The runner and every exercise view load only when a session starts.
const PracticeOverlay = dynamic(() => import("./practice-overlay").then((mod) => mod.PracticeOverlay), { ssr: false });

const ATTEMPT_STORES = ["attempts"] as const;

/** Sorted hard words with their reason, and a practice session over only those words (AC-030, AC-031). */
export function HardWordsView() {
  const profile = useProfile();
  const attempts = useStorageQuery(["attempts"], getAllAttempts, ATTEMPT_STORES);
  const level = profile.status === "ready" ? profile.data.level : null;
  const levels = useMemo(() => (level ? levelsFor(level) : null), [level]);
  const content = useContentIndex(levels);
  const [steps, setSteps] = useState<RunnerStep[] | null>(null);

  const attemptList = attempts.status === "ready" ? attempts.data : null;
  const index = content.status === "ready" ? content.index : null;
  const rows = useMemo(() => (attemptList && index ? hardWordRows(attemptList, index) : null), [attemptList, index]);

  if (profile.status === "error" || attempts.status === "error") {
    return <StorageError onRetry={attempts.status === "error" ? attempts.reload : profile.reload} />;
  }
  if (content.status === "error") return <ContentError onRetry={content.retry} />;
  if (!rows || !index) return <ListSkeleton rows={5} />;

  if (rows.length === 0) {
    return (
      <EmptyState icon={PartyPopper} title="Chưa có từ khó nào">
        <p className="max-w-sm text-sm text-muted-foreground">
          Tuyệt lắm! Khi bạn hay trả lời sai hoặc nhớ chậm một từ, từ đó sẽ hiện ở đây để bạn luyện thêm.
        </p>
      </EmptyState>
    );
  }

  function handleStart() {
    if (!rows || !index) return;
    const seed = Math.floor(Math.random() * 1_000_000);
    setSteps(practiceSteps(rows.map((row) => row.word.id), index, seed));
  }

  return (
    <div className="grid gap-4 px-4 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} từ, khó nhất ở trên cùng.
          {rows.length > PRACTICE_LIMIT ? ` Mỗi lượt luyện ${PRACTICE_LIMIT} từ đầu danh sách.` : null}
        </p>
        <Button size="lg" className="h-11 px-4" onClick={handleStart}>
          <Dumbbell aria-hidden /> Luyện các từ này
        </Button>
      </div>
      <ol className="grid gap-3" aria-label="Danh sách từ khó">
        {rows.map((row) => (
          <HardWordItem key={row.word.id} row={row} />
        ))}
      </ol>
      {steps ? <PracticeOverlay steps={steps} onClose={() => setSteps(null)} /> : null}
    </div>
  );
}

function HardWordItem({ row }: { row: HardWordRow }) {
  const Icon = row.reason === "often-wrong" ? XCircle : Clock;
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border bg-card px-4 py-3">
      <div className="min-w-0">
        <p lang="en" className="text-xl font-semibold">
          {row.word.body.headword}
        </p>
        <p className="text-muted-foreground">{row.word.body.meaningsVi[0]}</p>
        <p className="mt-1 text-sm text-muted-foreground">{row.stat}</p>
      </div>
      <Badge variant={row.reason === "often-wrong" ? "destructive" : "secondary"} className="shrink-0">
        <Icon aria-hidden /> {REASON_LABELS[row.reason]}
      </Badge>
    </li>
  );
}
