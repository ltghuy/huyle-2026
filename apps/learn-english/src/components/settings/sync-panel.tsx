"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { movedMessage } from "@/components/account/account-linker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canUseLockedAreas, useAccount } from "@/hooks/use-account";
import { useProfile } from "@/hooks/use-profile";
import { mergeSyncCode, SyncError } from "@/sync/sync-client";

const MERGED_NOTHING = "Đã gộp tiến độ của mã vào tài khoản.";
const MERGE_FAILED = "Chưa gộp được tiến độ của mã. Bạn thử lại nhé.";

/**
 * Old sync codes (feature 022, AC-019, AC-020): the account keeps progress in step now, so no new
 * codes are made. A signed-in learner can bring an old code's progress into the account once, until
 * codes stop working; the code is deleted afterwards. Nothing for guests, who can't sync.
 */
export function SyncPanel() {
  const { status } = useAccount();
  const profile = useProfile();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!canUseLockedAreas(status)) return null;
  const linked = profile.status === "ready" ? profile.data.sync?.code : undefined;

  async function merge(input: string) {
    setBusy(true);
    setError(null);
    try {
      const summary = await mergeSyncCode(input);
      setCode("");
      toast.success(movedMessage(summary) ?? MERGED_NOTHING);
    } catch (cause) {
      setError(cause instanceof SyncError ? cause.message : MERGE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void merge(code);
  }

  return (
    <Card id="dong-bo">
      <CardHeader>
        <CardTitle>Mã đồng bộ cũ</CardTitle>
        <CardDescription>
          Mã đồng bộ đã được thay bằng tài khoản Google. Nếu bạn còn một mã từ trước, hãy gộp tiến độ của mã đó vào tài khoản; mã sẽ bị xóa sau khi gộp.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {linked ? (
          <div className="grid gap-2">
            <p className="text-sm">
              Thiết bị này đang dùng mã <span className="font-mono">{linked}</span>.
            </p>
            <Button size="lg" className="h-11 w-fit px-4" disabled={busy} onClick={() => void merge(linked)}>
              Gộp mã này vào tài khoản
            </Button>
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="grid gap-2">
          <Label htmlFor="old-sync-code">Nhập mã đồng bộ</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="old-sync-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              autoComplete="off"
              className="h-11 max-w-56 font-mono uppercase"
              aria-invalid={error !== null}
              aria-describedby={error ? "old-sync-code-error" : undefined}
            />
            <Button type="submit" variant="outline" size="lg" className="h-11 px-4" disabled={busy || code.trim() === ""}>
              <KeyRound aria-hidden /> Gộp vào tài khoản
            </Button>
          </div>
          {error ? (
            <p id="old-sync-code-error" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
