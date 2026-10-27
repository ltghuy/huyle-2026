import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { ListSkeleton } from "@/components/shell/load-states";
import { VocabularyBrowser } from "@/components/vocabulary/vocabulary-browser";

export const metadata: Metadata = pageMetadata({ title: "Từ vựng", path: "/vocabulary", description: "Từ vựng tiếng Anh theo trình độ và chủ đề, kèm phiên âm IPA, phát âm, nghĩa tiếng Việt và câu ví dụ." });

export default function VocabularyPage() {
  return (
    <>
      <PageHeader title="Từ vựng" description="Từ vựng theo trình độ và chủ đề." />
      {/* The browser reads query params, so it renders in the browser below this boundary. */}
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <VocabularyBrowser />
      </Suspense>
    </>
  );
}
