import type { Metadata } from "next";
import { Suspense } from "react";
import { Shuffle } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { PageHero } from "@/components/shell/page-hero";
import { ListSkeleton } from "@/components/shell/load-states";
import { VerbsBrowser } from "@/components/verbs/verbs-browser";
import { pageMetadata } from "@/lib/site";

const BADGE = { icon: Shuffle, text: "Nhóm theo quy luật để dễ nhớ" };

export const metadata: Metadata = pageMetadata({
  title: "Động từ bất quy tắc",
  path: "/irregular-verbs",
  description: "Các động từ bất quy tắc thông dụng trong tiếng Anh với dạng quá khứ, quá khứ phân từ, nghĩa tiếng Việt và phát âm.",
});

export default function IrregularVerbsPage() {
  return (
    <>
      <PageHero size="sm" badge={BADGE} title="Động từ bất quy tắc" description="Dạng quá khứ (V2) và quá khứ phân từ (V3) của các động từ thông dụng." mascot={<Mascot mood="cheer" size="hero" />} />
      {/* The browser reads query params, so it renders in the browser below this boundary. */}
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <VerbsBrowser />
      </Suspense>
    </>
  );
}
