import { TopicFrame } from "@/components/playground/topic-frame";
import { ReactInternalsHandbook } from "@/handbook/react-internals/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("react-internals");

export default function ReactInternalsPage() {
  return (
    <TopicFrame page={getTopicPage("react-internals")}>
      <ReactInternalsHandbook />
    </TopicFrame>
  );
}
