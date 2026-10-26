import { NAV_FOLDERS } from "@/components/playground/nav-folders";

/** Indexable pages of this site for the demos' page pickers. */
export const PAGE_OPTIONS = [
  { value: "/seo/metadata-structured-data", label: "This page" },
  { value: "/", label: "Home" },
  ...NAV_FOLDERS.flatMap((f) => [
    { value: f.href, label: f.title },
    ...f.items.filter((i) => i.ready).map((i) => ({ value: i.href, label: `${f.title}: ${i.title}` })),
  ]).filter((o) => o.value !== "/seo/metadata-structured-data"),
];

/** Fetches a page's server HTML as a parsed document. */
export async function fetchDocument(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  return { status: res.status, doc: new DOMParser().parseFromString(await res.text(), "text/html") };
}

/** An absolute URL on the production host as a path on this origin, so it loads in development too. */
export function onThisOrigin(url: string) {
  try {
    const u = new URL(url);
    return u.hostname === "learn.huyle.work" ? u.pathname + u.search : url;
  } catch {
    return url;
  }
}
