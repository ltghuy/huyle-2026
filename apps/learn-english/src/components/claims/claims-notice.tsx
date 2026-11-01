"use client";

import { MessageSquareWarning } from "lucide-react";
import type { StoredClaim } from "@/learning/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** What the owner decided about claims the learner made (016 AC-015): their answer, the reference and the reason. */
export function ClaimsNotice({ claims, onDismiss }: { claims: readonly StoredClaim[]; onDismiss: () => void }) {
  function handleOpenChange(open: boolean) {
    if (!open) onDismiss();
  }

  return (
    <Dialog open={claims.length > 0} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85svh] gap-5 overflow-y-auto">
        <DialogHeader>
          <MessageSquareWarning className="size-10 text-primary" aria-hidden />
          <DialogTitle>{claims.length > 1 ? `${claims.length} câu bạn gửi chưa đúng` : "Câu bạn gửi chưa đúng"}</DialogTitle>
          <DialogDescription>Những từ và điểm ngữ pháp liên quan đã được đưa vào Ôn tập để bạn luyện lại.</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-4">
          {claims.map((claim) => (
            <li key={claim.id} className="grid gap-1 rounded-xl bg-muted p-4">
              <p className="text-muted-foreground">{claim.vi}</p>
              <p>
                Bạn viết:{" "}
                <span className="font-medium line-through decoration-destructive" lang="en">
                  {claim.answer}
                </span>
              </p>
              <p>
                Đáp án:{" "}
                <span className="font-semibold" lang="en">
                  {claim.expected}
                </span>
              </p>
              {claim.explanationVi ? <p className="text-sm text-muted-foreground">{claim.explanationVi}</p> : null}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" size="lg" className="h-12 w-full" onClick={onDismiss}>
            Đã hiểu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
