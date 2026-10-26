import { TopicFrame } from "@/components/playground/topic-frame";
import { NetworkingHandbook } from "@/handbook/networking/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("networking");

export default function NetworkingPage() {
  return (
    <TopicFrame page={getTopicPage("networking")}>
      <NetworkingHandbook />
    </TopicFrame>
  );
}
