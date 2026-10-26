import { TopicFrame } from "@/components/playground/topic-frame";
import { NewsFeedHandbook } from "@/handbook/system-design/news-feed";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("news-feed");

export default function NewsFeedPage() {
  return (
    <TopicFrame page={getTopicPage("news-feed")}>
      <NewsFeedHandbook />
    </TopicFrame>
  );
}
