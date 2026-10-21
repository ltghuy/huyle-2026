import { TopicFrame } from "@/components/playground/topic-frame";
import { BddHandbook } from "@/handbook/bdd/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("bdd-cucumber");

export default function BddPage() {
  return (
    <TopicFrame page={getTopicPage("bdd-cucumber")}>
      <BddHandbook />
    </TopicFrame>
  );
}
