import { TopicFrame } from "@/components/playground/topic-frame";
import { PerformanceHandbook } from "@/handbook/performance/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("performance");

export default function PerformancePage() {
  return (
    <TopicFrame page={getTopicPage("performance")}>
      <PerformanceHandbook />
    </TopicFrame>
  );
}
