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

interface GroupCardProps {
  group: AdminClaimGroup;
  busy: boolean;
  onDecide: (group: AdminClaimGroup, decision: ClaimDecision["decision"]) => void;
  onReject: (group: AdminClaimGroup) => void;
}

function GroupCard({ group, busy, onDecide, onReject }: GroupCardProps) {
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
      <div className="flex flex-wrap gap-2">
        {group.sentence ? (
          <>
            <Button className="h-11 gap-1.5" disabled={busy} onClick={() => onDecide(group, "approve")}>
              <Check aria-hidden /> Duyệt
            </Button>
            <Button variant="outline" className="h-11 gap-1.5" disabled={busy} onClick={() => onReject(group)}>
              <X aria-hidden /> Từ chối
            </Button>
          </>
        ) : (
          <Button variant="outline" className="h-11 gap-1.5" disabled={busy} onClick={() => onDecide(group, "drop")}>
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
  const [rejecting, setRejecting] = useState<AdminClaimGroup | null>(null);
  const [explanation, setExplanation] = useState("");
  const decide = useMutation({
    mutationFn: decideClaimGroup,
    onSuccess: (result, decision) => {
      toast(result.changed > 0 ? DECIDED[decision.decision] : ALREADY);
      setRejecting(null);
      setExplanation("");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) => toast.error(error.message),
  });

  function handleDecide(group: AdminClaimGroup, decision: ClaimDecision["decision"]) {
    decide.mutate({ ids: group.ids, decision });
  }

  function handleRejectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejecting || !explanation.trim()) return;
    decide.mutate({ ids: rejecting.ids, decision: "reject", explanationVi: explanation.trim() });
  }

  function handleDialogChange(open: boolean) {
    if (!open) setRejecting(null);
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
            <GroupCard key={group.key} group={group} busy={decide.isPending} onDecide={handleDecide} onReject={setRejecting} />
          ))}
        </ul>
      )}
      <Dialog open={rejecting !== null} onOpenChange={handleDialogChange}>
        <DialogContent>
          <form onSubmit={handleRejectSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Từ chối câu này?</DialogTitle>
              <DialogDescription lang="en">{rejecting?.answer}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="reject-why">Vì sao chưa đúng (người học sẽ đọc)</Label>
              <Textarea id="reject-why" value={explanation} onChange={(event) => setExplanation(event.target.value)} maxLength={500} required className="min-h-24" />
            </div>
            <DialogFooter>
              <Button type="submit" className="h-11" disabled={!explanation.trim() || decide.isPending}>
                Từ chối
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
