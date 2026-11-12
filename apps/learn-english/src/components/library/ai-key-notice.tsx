"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Settings, Sparkles, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { getAiKeys, getServerAiKeys, subscribeAiKeys } from "@/lib/ai-keys";
import { cn } from "@/lib/utils";

/**
 * A quiet suggestion in "Viết câu" to add an AI key (quick 070), shown while this device has none.
 * Any saved key counts, even one out of quota: Cài đặt explains those. Dismissing hides it only while
 * the learner stays in the tab: it unmounts on leaving, so it shows again on the way back.
 */
export function AiKeyNotice({ className }: { className?: string }) {
  const keys = useSyncExternalStore(subscribeAiKeys, getAiKeys, getServerAiKeys);
  const [dismissed, setDismissed] = useState(false);

  if (keys.length > 0 || dismissed) return null;

  return (
    <div role="note" aria-label="Gợi ý thêm khóa AI" className={className}>
      <div className="flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="grid flex-1 gap-2">
          <p className="text-sm text-muted-foreground">
            Thêm khóa AI miễn phí để bài viết được chấm theo nghĩa: viết khác đáp án mà đúng vẫn được tính, viết sai thì AI giải thích chỗ sai.
          </p>
          <div>
            <Link href="/settings#cham-bang-ai" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              <Settings aria-hidden /> Thêm khóa AI
            </Link>
          </div>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={() => setDismissed(true)} aria-label="Ẩn gợi ý">
          <X aria-hidden />
        </Button>
      </div>
    </div>
  );
}
