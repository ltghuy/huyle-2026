import { TopicFrame } from "@/components/playground/topic-frame";
import { HowSearchWorksHandbook } from "@/handbook/seo/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("how-search-works");

export default function HowSearchWorksPage() {
  return (
    <TopicFrame page={getTopicPage("how-search-works")}>
      <HowSearchWorksHandbook />
    </TopicFrame>
  );
}
