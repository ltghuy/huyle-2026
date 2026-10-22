import { TopicFrame } from "@/components/playground/topic-frame";
import { CrawlingIndexingHandbook } from "@/handbook/seo/crawling/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("crawling-indexing");

export default function CrawlingIndexingPage() {
  return (
    <TopicFrame page={getTopicPage("crawling-indexing")}>
      <CrawlingIndexingHandbook />
    </TopicFrame>
  );
}
