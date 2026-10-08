import { Hammer } from "lucide-react";

import { TopicFrame } from "@/components/playground/topic-frame";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("accessibility");

export default function AccessibilityPage() {
  return (
    <TopicFrame page={getTopicPage("accessibility")}>
      <section aria-label="Coming soon" className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
        <Hammer aria-hidden className="size-6 text-muted-foreground" />
        <p className="font-medium">Coming soon</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          This handbook hasn&apos;t been written yet. Until then, practice 8 (Accessible Modal) shows focus management and
          screen-reader announcements in practice.
        </p>
      </section>
    </TopicFrame>
  );
}
