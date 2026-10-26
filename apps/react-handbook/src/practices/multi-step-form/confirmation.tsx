"use client";

import { PackageCheck, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { Submission } from "@/server/practices/multi-step-form/application.schema";

const time = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export function Confirmation({ submission, onStartNew }: { submission: Submission; onStartNew: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section aria-labelledby="msf-confirmation" className="flex flex-col items-start gap-4 rounded-xl border bg-card p-6">
      <PackageCheck aria-hidden className="size-8 text-success" />
      <h2 id="msf-confirmation" ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
        Application sent
      </h2>
      <p>
        Thanks, {submission.summary.fullName}. Your application number is{" "}
        <strong className="font-mono">{submission.applicationId}</strong>.
      </p>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
        <dt className="text-muted-foreground">Role</dt>
        <dd>{submission.summary.role}</dd>
        <dt className="text-muted-foreground">Email</dt>
        <dd className="break-all">{submission.summary.email}</dd>
        <dt className="text-muted-foreground">Sent</dt>
        <dd>{time.format(new Date(submission.submittedAt))}</dd>
      </dl>
      <p className="text-sm text-muted-foreground">Your draft was deleted. We&apos;ll reply by email.</p>
      <Button type="button" variant="outline" onClick={onStartNew}>
        <RotateCcw aria-hidden /> Start a new application
      </Button>
    </section>
  );
}
