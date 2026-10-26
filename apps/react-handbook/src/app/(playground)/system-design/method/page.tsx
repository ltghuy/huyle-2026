import { TopicFrame } from "@/components/playground/topic-frame";
import { DesignMethodHandbook } from "@/handbook/system-design/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("method");

export default function DesignMethodPage() {
  return (
    <TopicFrame page={getTopicPage("method")}>
      <DesignMethodHandbook />
    </TopicFrame>
  );
}
