import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { Suspense } from "react";
import { GrammarBrowser } from "@/components/grammar/grammar-browser";
import { NotebookPen } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { PageHero } from "@/components/shell/page-hero";
import { ListSkeleton } from "@/components/shell/load-states";

const BADGE = { icon: NotebookPen, text: "12 thì và các điểm ngữ pháp" };

export const metadata: Metadata = pageMetadata({ title: "Ngữ pháp", path: "/grammar", description: "Các điểm ngữ pháp tiếng Anh và 12 thì theo trình độ, giải thích bằng tiếng Việt kèm ví dụ và bài luyện." });

export default function GrammarPage() {
  return (
    <>
      <PageHero size="sm" badge={BADGE} title="Ngữ pháp" description="Giải thích bằng tiếng Việt, có ví dụ và bài luyện ngắn cho từng điểm." mascot={<Mascot mood="think" size="hero" />} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <GrammarBrowser />
      </Suspense>
    </>
  );
}
