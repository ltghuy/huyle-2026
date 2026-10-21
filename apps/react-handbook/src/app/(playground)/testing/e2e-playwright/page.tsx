import { TopicFrame } from "@/components/playground/topic-frame";
import { PlaywrightHandbook } from "@/handbook/e2e/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("e2e-playwright");

export default function PlaywrightPage() {
  return (
    <TopicFrame page={getTopicPage("e2e-playwright")}>
      <PlaywrightHandbook />
    </TopicFrame>
  );
}
