import { TopicFrame } from "@/components/playground/topic-frame";
import { AutocompleteHandbook } from "@/handbook/system-design/autocomplete";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("autocomplete");

export default function AutocompletePage() {
  return (
    <TopicFrame page={getTopicPage("autocomplete")}>
      <AutocompleteHandbook />
    </TopicFrame>
  );
}
