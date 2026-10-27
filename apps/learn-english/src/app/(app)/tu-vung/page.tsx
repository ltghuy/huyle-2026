import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { ListSkeleton } from "@/components/shell/load-states";
import { VocabularyBrowser } from "@/components/vocabulary/vocabulary-browser";

export const metadata: Metadata = { title: "Từ vựng" };

export default function TuVungPage() {
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
