import { cookies } from "next/headers";

import { TopicFrame } from "@/components/playground/topic-frame";
import { bucketFor, FORCE_COOKIE, ID_COOKIE, isVariant, isVisitorId, newVisitorId, variantFor } from "@/handbook/ab/assign";
import { AbHandbook } from "@/handbook/ab/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("ab-testing");

// Reads the visitor's cookie, so this page renders per request: the first HTML
// already holds the visitor's variant, and nothing is stored on the server.
export default async function AbTestingPage() {
  const jar = await cookies();
  const saved = jar.get(ID_COOKIE)?.value;
  const id = isVisitorId(saved) ? saved : newVisitorId();
  const bucket = bucketFor(id);
  const forced = jar.get(FORCE_COOKIE)?.value;
  const variant = isVariant(forced) ? forced : variantFor(bucket);

  return (
    <TopicFrame page={getTopicPage("ab-testing")}>
      <AbHandbook assignment={{ id, bucket, variant, isNew: !isVisitorId(saved), forced: isVariant(forced) }} />
    </TopicFrame>
  );
}
