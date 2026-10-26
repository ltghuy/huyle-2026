import { TopicFrame } from "@/components/playground/topic-frame";
import { StrategyHandbook } from "@/handbook/testing/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("strategy");

export default function TestingStrategyPage() {
  return (
    <TopicFrame page={getTopicPage("strategy")}>
      <StrategyHandbook />
    </TopicFrame>
  );
}
