import { TopicFrame } from "@/components/playground/topic-frame";
import { RenderingHandbook } from "@/handbook/rendering/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("rendering");

export default function RenderingPage() {
  return (
    <TopicFrame page={getTopicPage("rendering")}>
      <RenderingHandbook />
    </TopicFrame>
  );
}
