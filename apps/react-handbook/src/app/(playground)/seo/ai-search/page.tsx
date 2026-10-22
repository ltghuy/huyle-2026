import { TopicFrame } from "@/components/playground/topic-frame";
import { AiSearchHandbook } from "@/handbook/seo/ai-search/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("ai-search");

export default function AiSearchPage() {
  return (
    <TopicFrame page={getTopicPage("ai-search")}>
      <AiSearchHandbook />
    </TopicFrame>
  );
}
