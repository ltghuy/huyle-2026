import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { Suspense } from "react";
import { BookOpenText } from "lucide-react";
import { Owl } from "@/components/mascot/owl";
import { PageHero } from "@/components/shell/page-hero";
import { ListSkeleton } from "@/components/shell/load-states";
import { VocabularyBrowser } from "@/components/vocabulary/vocabulary-browser";

const BADGE = { icon: BookOpenText, text: "Từ A1 đến C1, từ nào cũng có phát âm" };

export const metadata: Metadata = pageMetadata({ title: "Từ vựng", path: "/vocabulary", description: "Từ vựng tiếng Anh theo trình độ và chủ đề, kèm phiên âm IPA, phát âm, nghĩa tiếng Việt và câu ví dụ." });

export default function VocabularyPage() {
  return (
    <>
      <PageHero size="sm" badge={BADGE} title="Từ vựng" description="Học từ theo trình độ và chủ đề, mỗi từ có phiên âm, audio và câu ví dụ." mascot={<Owl mood="happy" size="hero" />} />
      {/* The browser reads query params, so it renders in the browser below this boundary. */}
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <VocabularyBrowser />
      </Suspense>
    </>
  );
}
