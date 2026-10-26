import { TopicFrame } from "@/components/playground/topic-frame";
import { OriginsHandbook } from "@/handbook/origins/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("origins-and-cors");

export default function OriginsAndCorsPage() {
  return (
    <TopicFrame page={getTopicPage("origins-and-cors")}>
      <OriginsHandbook />
    </TopicFrame>
  );
}
