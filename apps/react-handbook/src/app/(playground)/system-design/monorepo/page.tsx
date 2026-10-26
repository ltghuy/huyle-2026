import { TopicFrame } from "@/components/playground/topic-frame";
import { MonorepoHandbook } from "@/handbook/system-design/monorepo/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("monorepo");

export default function MonorepoPage() {
  return (
    <TopicFrame page={getTopicPage("monorepo")}>
      <MonorepoHandbook />
    </TopicFrame>
  );
}
