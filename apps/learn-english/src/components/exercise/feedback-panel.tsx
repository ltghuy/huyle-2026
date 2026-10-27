"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import type { GradeResult } from "@/learning/exercises/types";
import { cn } from "@/lib/utils";

/** How long a plain "Chính xác!" stays up; panels with an answer to read stay until the learner moves on. */
export const CORRECT_FEEDBACK_MS = 2000;

/** Outcome of a checked answer; never colour alone (icon + words). Render with a per-step `key`. */
export function FeedbackPanel({ result, relatedLink }: { result: GradeResult; relatedLink?: { href: string; label: string } }) {
  const tone = result.correct ? (result.typo ? "typo" : "correct") : "wrong";
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (tone !== "correct") return;
    const timer = setTimeout(() => setHidden(true), CORRECT_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [tone]);

  if (hidden) return null;
  const Icon = tone === "correct" ? CheckCircle2 : tone === "typo" ? CircleAlert : XCircle;
  const title = tone === "correct" ? "Chính xác!" : tone === "typo" ? "Gần đúng, chú ý chính tả" : "Chưa đúng";
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
        {tone !== "correct" ? (
          <p>
            Đáp án: <span className="font-semibold" lang="en">{result.expected}</span>
          </p>
        ) : null}
        {result.explanationVi ? <p className="text-sm text-muted-foreground">{result.explanationVi}</p> : null}
        {!result.correct && relatedLink ? (
          <Link href={relatedLink.href} target="_blank" className="text-sm text-link underline underline-offset-4">
            Xem lại: {relatedLink.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
