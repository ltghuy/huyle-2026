"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCheck, CheckCircle2, CircleAlert, Sparkles, XCircle } from "lucide-react";
import type { GradeResult } from "@/learning/exercises/types";
import { cn } from "@/lib/utils";

/** How long a plain "Chính xác!" stays up; panels with an answer to read stay until the learner moves on. */
export const CORRECT_FEEDBACK_MS = 2000;

type Tone = "correct" | "ai-correct" | "typo" | "wrong" | "claimed";

const TONE_ICONS = { correct: CheckCircle2, "ai-correct": CheckCircle2, typo: CircleAlert, wrong: XCircle, claimed: CheckCheck } as const satisfies Record<Tone, unknown>;
const TONE_TITLES: Record<Tone, string> = {
  correct: "Chính xác!",
  "ai-correct": "Chính xác!",
  typo: "Gần đúng, chú ý chính tả",
  wrong: "Chưa đúng",
  claimed: "Đã tính là đúng",
};

function toneOf(result: GradeResult): Tone {
  if (result.claimed) return "claimed";
  if (!result.correct) return "wrong";
  if (result.aiGraded) return "ai-correct";
  return result.typo ? "typo" : "correct";
}

/** Outcome of a checked answer; never colour alone (icon + words). Render with a per-step `key`. */
export function FeedbackPanel({ result, relatedLink }: { result: GradeResult; relatedLink?: { href: string; label: string } }) {
  const tone = toneOf(result);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (tone !== "correct") return;
    const timer = setTimeout(() => setHidden(true), CORRECT_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [tone]);

  if (hidden) return null;
  const Icon = TONE_ICONS[tone];
  const title = TONE_TITLES[tone];
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-xl border-2 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
        tone === "wrong" ? "border-destructive/40 bg-destructive/10" : "border-success/40 bg-success/10",
      )}
    >
      <Icon className={cn("mt-0.5 size-6 shrink-0", tone === "wrong" ? "text-destructive" : "text-success")} aria-hidden />
      <div className="grid gap-1">
        <p className="font-semibold">{title}</p>
        {tone === "claimed" ? (
          <p>Câu của bạn sẽ được kiểm tra sau. Nếu chưa đúng, bạn sẽ được báo lại.</p>
        ) : tone === "ai-correct" ? (
          <p>
            Một cách nói khác: <span className="font-semibold" lang="en">{result.expected}</span>
          </p>
        ) : tone !== "correct" ? (
          <p>
            Đáp án: <span className="font-semibold" lang="en">{result.expected}</span>
          </p>
        ) : null}
        {result.explanationVi ? <p className="text-sm text-muted-foreground">{result.explanationVi}</p> : null}
        {result.aiGraded ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Sparkles className="size-4 shrink-0" aria-hidden /> Chấm bằng AI
          </p>
        ) : null}
        {result.aiUnavailable ? <p className="text-sm text-muted-foreground">Lúc này chưa chấm bằng AI được, nên câu của bạn được so với đáp án.</p> : null}
        {!result.correct && relatedLink ? (
          <Link href={relatedLink.href} target="_blank" className="text-sm text-link underline underline-offset-4">
            Xem lại: {relatedLink.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
