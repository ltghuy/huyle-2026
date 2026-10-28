import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { ListSkeleton } from "@/components/shell/load-states";
import { VerbsBrowser } from "@/components/verbs/verbs-browser";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Động từ bất quy tắc",
  path: "/irregular-verbs",
  description: "Các động từ bất quy tắc thông dụng trong tiếng Anh với dạng quá khứ, quá khứ phân từ, nghĩa tiếng Việt và phát âm.",
});

export default function IrregularVerbsPage() {
  return (
    <>
      <PageHeader title="Động từ bất quy tắc" description="Dạng quá khứ (V2) và quá khứ phân từ (V3) của các động từ thông dụng." />
      {/* The browser reads query params, so it renders in the browser below this boundary. */}
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <VerbsBrowser />
      </Suspense>
    </>
  );
}
