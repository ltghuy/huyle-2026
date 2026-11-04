"use client";

import { useEffect, useState } from "react";
import { Copy, Link2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { roomPath } from "./join-room";
import { Tile } from "./tile";

/** The invite link for a room on this site. */
export function inviteLink(code: string, origin: string = window.location.origin): string {
  return `${origin}${roomPath(code)}`;
}

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error("Không sao chép được. Bạn chép mã bằng tay nhé.");
  }
}

/** The link as a QR code, drawn here: `qrcode` is loaded only when the learner opens it (bundle size). */
function QrImage({ link }: { link: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((qr) => qr.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" }))
      .then(
        (drawn) => {
          if (!cancelled) setSvg(drawn);
        },
        () => {
          if (!cancelled) setFailed(true);
        },
      );
    return () => {
      cancelled = true;
    };
  }, [link]);

  if (failed) return <p className="text-sm text-muted-foreground">Không tạo được mã QR. Bạn gửi liên kết nhé.</p>;
  if (!svg) return <div className="size-56 animate-pulse rounded-lg bg-muted" aria-hidden />;
  // A white quiet zone keeps it scannable in dark mode too.
  return <div role="img" aria-label={`Mã QR của liên kết ${link}`} className="size-56 rounded-lg bg-white p-2 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** The room code as big tiles, with copy and share (AC-003). */
export function InvitePanel({ code }: { code: string }) {
  const [qrOpen, setQrOpen] = useState(false);
  const link = typeof window === "undefined" ? "" : inviteLink(code);

  function handleCopyCode() {
    void copy(code, "Đã sao chép mã phòng");
  }

  function handleCopyLink() {
    void copy(link, "Đã sao chép liên kết mời");
  }

  return (
    <section aria-labelledby="invite-title" className="grid justify-items-center gap-4 text-center">
      <h2 id="invite-title" className="text-sm font-medium text-muted-foreground">
        Mã phòng
      </h2>
      <p className="sr-only">{code.split("").join(" ")}</p>
      <div aria-hidden className="flex gap-1.5 sm:gap-2">
        {code.split("").map((letter, i) => (
          <Tile key={i} size="lg">
            {letter}
          </Tile>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" className="h-11 gap-2" onClick={handleCopyCode}>
          <Copy aria-hidden /> Sao chép mã
        </Button>
        <Button variant="outline" className="h-11 gap-2" onClick={handleCopyLink}>
          <Link2 aria-hidden /> Sao chép liên kết
        </Button>
        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogTrigger render={<Button variant="outline" className="h-11 gap-2" />}>
            <QrCode aria-hidden /> Mã QR
          </DialogTrigger>
          <DialogContent className="justify-items-center sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Quét để vào phòng {code}</DialogTitle>
              <DialogDescription>Bạn bè quét mã bằng camera điện thoại để mở phòng.</DialogDescription>
            </DialogHeader>
            {qrOpen ? <QrImage link={link} /> : null}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
