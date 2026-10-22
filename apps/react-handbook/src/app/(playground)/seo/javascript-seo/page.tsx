import { TopicFrame } from "@/components/playground/topic-frame";
import { JavascriptSeoHandbook } from "@/handbook/seo/javascript/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("javascript-seo");

export default function JavascriptSeoPage() {
  return (
    <TopicFrame page={getTopicPage("javascript-seo")}>
      <JavascriptSeoHandbook />
    </TopicFrame>
  );
}
