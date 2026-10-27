"use client";

import { UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProfile } from "@/hooks/use-profile";
import { NameForm } from "./name-form";

// Controlled and never closed from inside: Escape and outside clicks ask to
// close, and ignoring that keeps the dialog up until a name is saved (AC-002).
function ignoreOpenChange() {}

/** Asks for the learner's name on any page until one is stored (AC-001, AC-005). */
export function NamePrompt() {
  const profile = useProfile();
  const open = profile.status === "ready" && !profile.data.displayName;

  return (
    <Dialog open={open} onOpenChange={ignoreOpenChange}>
      <DialogContent showCloseButton={false} className="gap-5">
        <DialogHeader>
          <UserRound className="size-10 text-primary" aria-hidden />
          <DialogTitle>Bạn tên là gì?</DialogTitle>
          <DialogDescription>Cho mình biết tên để ứng dụng gọi bạn cho thân mật. Tên này cũng sẽ được ghi lên chứng nhận sau này.</DialogDescription>
        </DialogHeader>
        <NameForm id="name-prompt-input" label="Tên của bạn" submitLabel="Bắt đầu" stacked autoFocus />
      </DialogContent>
    </Dialog>
  );
}
