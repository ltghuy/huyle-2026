"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/learning/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useStorageQuery } from "@/hooks/use-storage-query";
import type { ContentIndex } from "@/lib/session/content-index";
import { buyExtraLesson, getExtraOffer } from "@/lib/session/extra";
import { cn } from "@/lib/utils";

const OFFER_STORES = ["lessons", "attendance", "extraLessons", "cards"] as const;

interface ExtraLessonCardProps {
  profile: Pick<Profile, "level" | "timeZone" | "vocabSet">;
  index: ContentIndex;
  contentVersion: number;
}

/**
 * After today's lesson (feature 013): buy another lesson with points, at a
 * price that grows 30% with each one today (AC-003 to AC-007), or carry on
 * with the one already bought (AC-009). Hidden until the daily lesson is done.
 */
export function ExtraLessonCard({ profile, index, contentVersion }: ExtraLessonCardProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const loadOffer = useCallback(() => getExtraOffer({ profile, index, contentVersion, now: Date.now() }), [profile, index, contentVersion]);
  const query = useStorageQuery(["extra-offer", profile.level, profile.timeZone, profile.vocabSet, contentVersion], loadOffer, OFFER_STORES);

  if (query.status !== "ready" || !query.data.dailyDone) return null;
  const { open, hasNewWords, price, priceAfter } = query.data;
  const balance = Math.max(0, query.data.balance);

  async function handleBuy() {
    setBusy(true);
    const result = await buyExtraLesson({ profile, index, contentVersion, now: Date.now() }).catch(() => null);
    setBusy(false);
    setConfirming(false);
    if (result?.status === "bought" || result?.status === "open") router.push("/extra-lesson");
    else if (result?.status === "not-enough") toast.error(`Bạn cần ${result.price} điểm, bạn đang có ${Math.max(0, result.balance)} điểm.`);
    else if (result?.status === "nothing-new") toast.info("Bạn đã học hết từ mới ở trình độ này.");
    else toast.error("Chưa mua được bài học thêm. Bạn thử lại nhé.");
  }

  return (
    <section className="rounded-xl border bg-card p-5" aria-labelledby="extra-title">
      <div className="flex items-start gap-3">
        <Coins className="size-6 shrink-0 text-streak" aria-hidden />
        <div className="grid gap-1">
          <h2 id="extra-title" className="text-lg font-semibold">
            {open ? "Bạn đang học dở bài học thêm" : "Học thêm một bài"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {open
              ? "Bài này đã được trả điểm. Bạn học tiếp lúc nào cũng được trong hôm nay."
              : hasNewWords
                ? `Dùng điểm để học thêm từ mới hôm nay. Bạn đang có ${balance} điểm.`
                : "Bạn đã học hết từ mới ở trình độ này. Hẹn gặp lại bạn ngày mai."}
          </p>
        </div>
      </div>
      {open ? (
        <Link href="/extra-lesson" className={cn(buttonVariants({ size: "lg" }), "mt-4 h-12 w-full text-base")}>
          Học tiếp bài học thêm
        </Link>
      ) : hasNewWords ? (
        <div className="mt-4 grid gap-2">
          <Button size="lg" className="h-12 w-full text-base" disabled={balance < price} onClick={() => setConfirming(true)}>
            Học thêm một bài · {price} điểm
          </Button>
          {balance < price ? (
            <p className="text-sm text-muted-foreground">
              Bạn cần {price} điểm, bạn đang có {balance} điểm. Học xong bài ngày mai để được thêm điểm nhé.
            </p>
          ) : null}
        </div>
      ) : null}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dùng {price} điểm để học thêm?</AlertDialogTitle>
            <AlertDialogDescription>
              Bài học thêm có ôn tập, từ mới và đặt câu như bài hằng ngày, nhưng không được cộng điểm. Bạn còn {balance - price} điểm, và bài tiếp theo hôm nay giá{" "}
              {priceAfter} điểm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleBuy} disabled={busy}>
              Dùng {price} điểm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
