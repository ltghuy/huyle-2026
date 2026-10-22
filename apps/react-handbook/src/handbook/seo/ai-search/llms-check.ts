// Checks an llms.txt against the format proposed at llmstxt.org: an H1 with
// the name (the only required part), an optional blockquote summary, optional
// notes without headings, then H2 sections that each hold a list of
// `[name](url)` links with optional notes after a colon.

export type LlmsLink = { name: string; url: string; notes: string; line: number };

export type LlmsSection = { name: string; line: number; links: LlmsLink[] };

export type Problem = { line: number; text: string; level: "error" | "note" };

export type LlmsReport = { title: string | null; summary: string | null; sections: LlmsSection[]; problems: Problem[] };

const LINK = /^[-*]\s+\[([^\]]+)\]\(([^)\s]+)\)(?::\s*(.*))?$/;

export function checkLlms(input: string): LlmsReport {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/);
  const problems: Problem[] = [];
  const sections: LlmsSection[] = [];
  let title: string | null = null;
  let summary: string | null = null;
  let seenContent = false;

  for (const [i, raw] of lines.entries()) {
    const line = i + 1;
    const text = raw.trim();
    if (text === "") continue;
    const heading = text.match(/^(#{1,6})\s+(.*)$/);

    if (!seenContent) {
      seenContent = true;
      if (heading?.[1] === "#") {
        title = heading[2];
        continue;
      }
      problems.push({ line, text: "The file must start with an H1 holding the site or project name.", level: "error" });
    }

    if (heading) {
      if (heading[1] === "#") problems.push({ line, text: "Only one H1 is allowed.", level: "error" });
      else if (heading[1] === "##") sections.push({ name: heading[2], line, links: [] });
      else problems.push({ line, text: `${heading[1]} heading: sections are separated by H2 headings only.`, level: "error" });
      continue;
    }

    const section = sections.at(-1);
    if (!section) {
      // Before the first section: the summary, then free notes.
      if (text.startsWith(">")) {
        if (summary === null) summary = text.replace(/^>\s?/, "");
        else problems.push({ line, text: "A second summary line. The summary is one blockquote.", level: "note" });
      }
      continue;
    }

    const link = text.match(LINK);
    if (!link) {
      problems.push({ line, text: "Sections hold a list of links: - [name](url): notes", level: "error" });
      continue;
    }
    const [, name, url, notes = ""] = link;
    section.links.push({ name, url, notes, line });
    if (!/^https?:\/\//.test(url)) problems.push({ line, text: `${url} is relative. Absolute URLs work wherever the file is read.`, level: "note" });
  }

  if (!seenContent) problems.push({ line: 1, text: "The file is empty: it needs at least an H1 with the name.", level: "error" });
  if (title !== null && summary === null) problems.push({ line: 2, text: "No summary. A one-line blockquote after the H1 is optional but expected.", level: "note" });
  for (const s of sections) if (s.links.length === 0) problems.push({ line: s.line, text: `Section "${s.name}" has no links.`, level: "note" });

  return { title, summary, sections, problems: problems.sort((a, b) => a.line - b.line) };
}

export const SAMPLES = {
  minimal: "# Acme Docs\n",
  broken: `Acme Docs

> Guides for the Acme API.

## Guides
- [Quick start](/docs/start): install and first call
- Authentication guide
### Advanced
- [Webhooks](https://acme.dev/docs/webhooks)
`,
} as const;
