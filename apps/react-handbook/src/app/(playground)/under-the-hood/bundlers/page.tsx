import { TopicFrame } from "@/components/playground/topic-frame";
import { BundlersHandbook } from "@/handbook/bundlers/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("bundlers");

export default function BundlersPage() {
  return (
    <TopicFrame page={getTopicPage("bundlers")}>
      <BundlersHandbook />
    </TopicFrame>
  );
}
