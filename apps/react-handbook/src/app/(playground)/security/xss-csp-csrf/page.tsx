import { TopicFrame } from "@/components/playground/topic-frame";
import { WebAttacksHandbook } from "@/handbook/security/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("xss-csp-csrf");

export default function XssCspCsrfPage() {
  return (
    <TopicFrame page={getTopicPage("xss-csp-csrf")}>
      <WebAttacksHandbook />
    </TopicFrame>
  );
}
