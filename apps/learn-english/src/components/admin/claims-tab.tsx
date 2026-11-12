"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Check, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { decideClaimGroup, fetchClaimGroups } from "@/lib/admin-client";
import type { AdminClaimGroup, ClaimDecision } from "@/server/admin/admin.schema";

// "Duyệt câu" (feature 038, AC-009 to AC-012): one card per claimed wording, oldest first.

export const CLAIMS_KEY = ["admin", "claims"] as const;
const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export const DECIDED: Record<ClaimDecision["decision"], string> = {
  approve: "Đã duyệt: câu này giờ được chấm đúng.",
  reject: "Đã từ chối. Người học sẽ thấy lời giải thích.",
  drop: "Đã bỏ qua.",
};
const ALREADY = "Nhóm này đã được quyết định ở nơi khác.";

/** Approve and reject ask for a reason in a dialog: optional and prefilled with the AI's on approve (feature 042), required on reject. */
type Asked = "approve" | "reject";

interface GroupCardProps {
  group: AdminClaimGroup;
  busy: boolean;
  onDrop: (group: AdminClaimGroup) => void;
  onAsk: (group: AdminClaimGroup, decision: Asked) => void;
}

function GroupCard({ group, busy, onDrop, onAsk }: GroupCardProps) {
  return (
    <li className="grid gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">{date.format(group.firstAt)}</span>
        <span aria-hidden>·</span>
        <span>{group.count} người gửi</span>
        {group.sentence ? <Badge variant="outline">{group.sentence.level}</Badge> : null}
        {group.ai ? (
          <Badge variant="secondary" className="gap-1">
            <Sparkles aria-hidden className="size-3" /> AI chấm đúng
          </Badge>
        ) : null}
      </div>
      {group.sentence ? (
        <div className="grid gap-1">
          <p className="font-medium">{group.sentence.vi}</p>
          <p className="text-sm text-muted-foreground">
            Đã chấp nhận:{" "}
            <span lang="en">
              {group.accepted.slice(0, 3).join(" · ")}
              {group.accepted.length > 3 ? ` (+${group.accepted.length - 3})` : ""}
            </span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Câu {group.sentenceId} không còn trong khóa học.</p>
      )}
      <p className="rounded-lg bg-muted px-3 py-2 text-lg" lang="en">
        {group.answer}
      </p>
      {group.aiExplanationVi ? (
        <div className="grid gap-1 rounded-lg border border-dashed px-3 py-2 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <Sparkles aria-hidden className="size-4" /> AI giải thích
          </p>
          <p>{group.aiExplanationVi}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {group.sentence ? (
          <>
            <Button className="h-11 gap-1.5" disabled={busy} onClick={() => onAsk(group, "approve")}>
              <Check aria-hidden /> Duyệt
            </Button>
            <Button variant="outline" className="h-11 gap-1.5" disabled={busy} onClick={() => onAsk(group, "reject")}>
              <X aria-hidden /> Từ chối
            </Button>
          </>
        ) : (
          <Button variant="outline" className="h-11 gap-1.5" disabled={busy} onClick={() => onDrop(group)}>
            <Trash2 aria-hidden /> Bỏ qua
          </Button>
        )}
      </div>
    </li>
  );
}

export function ClaimsTab() {
  const queryClient = useQueryClient();
  const claims = useQuery({ queryKey: CLAIMS_KEY, queryFn: fetchClaimGroups, retry: false });
  const [asking, setAsking] = useState<{ group: AdminClaimGroup; decision: Asked } | null>(null);
  const [explanation, setExplanation] = useState("");
  const decide = useMutation({
    mutationFn: decideClaimGroup,
    onSuccess: (result, decision) => {
      toast(result.changed > 0 ? DECIDED[decision.decision] : ALREADY);
      setAsking(null);
      setExplanation("");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) => toast.error(error.message),
  });

  function handleDrop(group: AdminClaimGroup) {
    decide.mutate({ ids: group.ids, decision: "drop" });
  }

  function handleAsk(group: AdminClaimGroup, decision: Asked) {
    setAsking({ group, decision });
    // Approving starts from the AI's reason, if it gave one (AC-003); a rejection is written fresh.
    setExplanation(decision === "approve" ? (group.aiExplanationVi ?? "") : "");
  }

  function handleAskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!asking) return;
    const text = explanation.trim();
    if (asking.decision === "reject" && !text) return;
    decide.mutate({ ids: asking.group.ids, decision: asking.decision, ...(text ? { explanationVi: text } : {}) });
  }

  function handleDialogChange(open: boolean) {
    if (!open) setAsking(null);
  }

  if (claims.isPending) {
    return (
      <p role="status" className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 aria-hidden className="size-4 animate-spin" /> Đang tải…
      </p>
    );
  }
  if (claims.error) {
    return (
      <p role="alert" className="text-destructive">
        {claims.error.message}
      </p>
    );
  }
  const groups = claims.data.groups;
  return (
    <section aria-label="Câu chờ duyệt" className="grid gap-3">
      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-muted-foreground">Không có câu nào chờ duyệt.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <GroupCard key={group.key} group={group} busy={decide.isPending} onDrop={handleDrop} onAsk={handleAsk} />
          ))}
        </ul>
      )}
      <Dialog open={asking !== null} onOpenChange={handleDialogChange}>
        <DialogContent>
          <form onSubmit={handleAskSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{asking?.decision === "approve" ? "Duyệt câu này?" : "Từ chối câu này?"}</DialogTitle>
              <DialogDescription lang="en">{asking?.group.answer}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="decide-why">{asking?.decision === "approve" ? "Vì sao câu này đúng (người học sẽ đọc)" : "Vì sao chưa đúng (người học sẽ đọc)"}</Label>
              <Textarea
                id="decide-why"
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                maxLength={500}
                required={asking?.decision === "reject"}
                aria-describedby={asking?.decision === "approve" ? "decide-why-hint" : undefined}
                className="min-h-24"
              />
              {asking?.decision === "approve" ? (
                <p id="decide-why-hint" className="text-sm text-muted-foreground">
                  Người học viết đúng câu này sẽ thấy lời giải thích. Để trống nếu không cần.
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="submit" className="h-11" disabled={(asking?.decision === "reject" && !explanation.trim()) || decide.isPending}>
                {asking?.decision === "approve" ? "Duyệt" : "Từ chối"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
