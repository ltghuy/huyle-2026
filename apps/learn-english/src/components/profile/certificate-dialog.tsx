"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { achievementText, certificateFileName, certificatePng, certificateSummary, type CertificateData } from "./certificate";

type Image = { status: "loading" } | { status: "ready"; blob: Blob; url: string } | { status: "error" };

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Give the browser a moment to start the download before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The drawn certificate for an open dialog; the object URL is released on close. */
function useCertificateImage(data: CertificateData | null): Image {
  // Each result remembers which certificate it was drawn for, so a stale one reads as loading.
  const [drawn, setDrawn] = useState<{ for: CertificateData; image: Image } | null>(null);

  useEffect(() => {
    if (!data) return;
    let url: string | null = null;
    let cancelled = false;
    certificatePng(data).then(
      (blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setDrawn({ for: data, image: { status: "ready", blob, url } });
      },
      () => !cancelled && setDrawn({ for: data, image: { status: "error" } }),
    );
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [data]);

  return drawn && drawn.for === data ? drawn.image : { status: "loading" };
}

/** A finished row's certificate with "Tải về" (feature 009, AC-004, AC-006, AC-007). */
export function CertificateDialog({ data, onClose }: { data: CertificateData | null; onClose: () => void }) {
  const image = useCertificateImage(data);

  function handleDownload() {
    if (!data || image.status !== "ready") return;
    try {
      saveBlob(image.blob, certificateFileName(data.kind, data.level));
    } catch {
      toast.error("Không tải được chứng nhận. Bạn thử lại nhé.");
    }
  }

  return (
    <Dialog open={data !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-4 overflow-y-auto p-5 sm:max-w-3xl">
        {data ? (
          <>
            <DialogHeader>
              <DialogTitle>Chứng nhận hoàn thành</DialogTitle>
              <DialogDescription>Bạn đã học xong {achievementText(data.kind, data.level, data.total)}.</DialogDescription>
            </DialogHeader>
            {image.status === "ready" ? (
              // A blob URL drawn in the browser: next/image has nothing to optimise here.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.url} alt={certificateSummary(data)} className="aspect-[1600/1130] w-full rounded-lg shadow-sm ring-1 ring-border" />
            ) : image.status === "loading" ? (
              <Skeleton className="aspect-[1600/1130] w-full rounded-lg" />
            ) : (
              <p className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive" role="alert">
                Không vẽ được chứng nhận trên trình duyệt này. Bạn thử tải lại trang nhé.
              </p>
            )}
            <DialogFooter className="gap-2 sm:justify-end">
              <DialogClose render={<Button variant="ghost" className="h-11" />}>Đóng</DialogClose>
              <Button className="h-11" onClick={handleDownload} disabled={image.status !== "ready"}>
                <Download aria-hidden /> Tải về
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
