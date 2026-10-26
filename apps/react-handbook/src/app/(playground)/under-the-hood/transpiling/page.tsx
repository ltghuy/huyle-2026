import { TopicFrame } from "@/components/playground/topic-frame";
import { TranspilingHandbook } from "@/handbook/transpiling/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("transpiling");

export default function TranspilingPage() {
  return (
    <TopicFrame page={getTopicPage("transpiling")}>
      <TranspilingHandbook />
    </TopicFrame>
  );
}
