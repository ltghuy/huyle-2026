// Feature 045: a room created after following Cộng đồng's "Tạo phòng" links remembers it,
// so its host can invite any online learner. The links carry `?from=community`; the setup
// screens read it when "Tạo phòng" is pressed, so the prerendered page never depends on it.

const PARAM = "from";
const VALUE = "community";

/** The create screen's path, marked as opened from Cộng đồng. */
export function fromCommunity(path: string): string {
  return `${path}?${PARAM}=${VALUE}`;
}

/** Whether this page was opened from Cộng đồng. Call it in an event handler, not while rendering. */
export function openedFromCommunity(search: string = window.location.search): boolean {
  return new URLSearchParams(search).get(PARAM) === VALUE;
}
