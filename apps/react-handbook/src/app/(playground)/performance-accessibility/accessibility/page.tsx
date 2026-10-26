import { TopicFrame } from "@/components/playground/topic-frame";
import { AccessibilityHandbook } from "@/handbook/accessibility/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("accessibility");

export default function AccessibilityPage() {
  return (
    <TopicFrame page={getTopicPage("accessibility")}>
      <AccessibilityHandbook />
    </TopicFrame>
  );
}
