import { TopicFrame } from "@/components/playground/topic-frame";
import { MicroFrontendsHandbook } from "@/handbook/system-design/micro-frontends/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("micro-frontends");

export default function MicroFrontendsPage() {
  return (
    <TopicFrame page={getTopicPage("micro-frontends")}>
      <MicroFrontendsHandbook />
    </TopicFrame>
  );
}
