import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { Suspense } from "react";
import { GrammarBrowser } from "@/components/grammar/grammar-browser";
import { PageHeader } from "@/components/shell/page-header";
import { ListSkeleton } from "@/components/shell/load-states";

export const metadata: Metadata = pageMetadata({ title: "Ngữ pháp", path: "/grammar", description: "Các điểm ngữ pháp tiếng Anh và 12 thì theo trình độ, giải thích bằng tiếng Việt kèm ví dụ và bài luyện." });

export default function NguPhapPage() {
  return (
    <>
      <PageHeader title="Ngữ pháp" description="Các điểm ngữ pháp và 12 thì trong tiếng Anh." />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <GrammarBrowser />
      </Suspense>
    </>
  );
}
