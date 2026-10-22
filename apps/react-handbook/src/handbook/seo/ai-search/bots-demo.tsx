"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Verdict } from "@/handbook/ui";
import { AI_BOTS, JOB_LABEL, type BotJob } from "@/lib/ai-bots";

import { FetchError } from "../crawling/fetch-error";
import { checkRobots, parseRobots, type RobotsVerdict } from "../crawling/robots-txt";
import { useText } from "../crawling/use-text";
import { FieldSelect } from "../field-select";

// The search engines' own crawlers, for comparison: they feed normal search
// and, for Google, AI Overviews and AI Mode too.
const SEARCH_ENGINES = [
  { token: "Googlebot", vendor: "Google", job: "search" as const, note: "Search, AI Overviews and AI Mode" },
  { token: "Bingbot", vendor: "Microsoft", job: "search" as const, note: "Search and Copilot" },
  { token: "Applebot", vendor: "Apple", job: "search" as const, note: "Search, may also train" },
];

const ROWS = [...AI_BOTS.map((b) => ({ ...b, note: undefined as string | undefined })), ...SEARCH_ENGINES.map((b) => ({ ...b, mayIgnoreRobots: false }))];

const SAMPLES = {
  blockAll: `# Every crawler, AI or not, blocked everywhere
User-agent: *
Disallow: /
`,
  extendedOnly: `# Blocks Gemini training, but not AI Overviews:
# those use Googlebot.
User-agent: Google-Extended
Disallow: /

User-agent: *
Allow: /
`,
  gptbotOnly: `# Out of OpenAI training, still in ChatGPT search
User-agent: GPTBot
Disallow: /

User-agent: *
Allow: /
`,
} as const;

type JobFilter = "all" | BotJob;

const JOB_OPTIONS: { value: JobFilter; label: string }[] = [
  { value: "all", label: "All bots" },
  { value: "training", label: "Training" },
  { value: "control", label: "Training control" },
  { value: "search", label: "AI search" },
  { value: "user", label: "User request" },
];

function decidedBy(v: RobotsVerdict, token: string) {
  if (v.matchedAgent === null) return "No group applies and there's no * group: everything is allowed.";
  const group = v.matchedAgent === "*" ? "the * group" : `its own group (${token})`;
  return v.rule ? `Line ${v.rule.line}, ${v.rule.allow ? "Allow" : "Disallow"}: ${v.rule.path}, in ${group}` : `No rule in ${group} matches, so it's allowed`;
}

export function BotsDemo() {
  const { load, retry } = useText("/robots.txt");
  const [text, setText] = useState<string | null>(null);
  const [rawPath, setRawPath] = useState("/seo/ai-search");
  const [job, setJob] = useState<JobFilter>("all");
  const textId = useId();
  const pathId = useId();

  // Until the learner edits or loads a sample, the rules are this site's file.
  const live = load.state === "done" ? load.text : "";
  const rules = text ?? live;
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const parsed = parseRobots(rules);
  const rows = ROWS.filter((r) => job === "all" || r.job === job);

  function handleLive() {
    setText(null);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {load.state === "error" ? <FetchError what="/robots.txt" message={load.message} onRetry={retry} /> : null}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor={textId}>{text === null ? "This site's robots.txt, fetched now" : "robots.txt to test"}</Label>
          <Textarea
            id={textId}
            value={load.state === "loading" && text === null ? "Fetching /robots.txt…" : rules}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            spellCheck={false}
            className="font-mono text-xs leading-relaxed"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={load.state !== "done"} onClick={handleLive}>
              This site&apos;s file
            </Button>
            <Button size="sm" variant="outline" onClick={() => setText(SAMPLES.gptbotOnly)}>
              Block GPTBot only
            </Button>
            <Button size="sm" variant="outline" onClick={() => setText(SAMPLES.extendedOnly)}>
              Block Google-Extended only
            </Button>
            <Button size="sm" variant="outline" onClick={() => setText(SAMPLES.blockAll)}>
              Block everything
            </Button>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={pathId} className="text-xs">
              URL path
            </Label>
            <Input id={pathId} value={rawPath} onChange={(e) => setRawPath(e.target.value)} spellCheck={false} className="font-mono text-xs" />
          </div>
          <FieldSelect label="Show" value={job} options={JOB_OPTIONS} onChange={setJob} />
          {parsed.ignored.length > 0 ? (
            <ul className="flex list-disc flex-col gap-0.5 pl-4 text-xs text-foreground/80">
              {parsed.ignored.map((item) => (
                <li key={item.line}>
                  Line {item.line} ignored ({item.text}): {item.why}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <Table aria-label={`AI bots and whether they may fetch ${path}`}>
        <TableHeader>
          <TableRow>
            <TableHead>Bot</TableHead>
            <TableHead>Job</TableHead>
            <TableHead>{path}</TableHead>
            <TableHead>Decided by</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const v = checkRobots(parsed, row.token, path);
            return (
              <TableRow key={row.token}>
                <TableCell className="align-top">
                  <span className="font-mono text-xs">{row.token}</span>
                  <span className="block text-xs text-foreground/75">{row.vendor}</span>
                </TableCell>
                <TableCell className="align-top text-xs">
                  {row.note ? "Search engine" : JOB_LABEL[row.job]}
                  {row.note ? <span className="block text-foreground/75">{row.note}</span> : null}
                </TableCell>
                <TableCell className="align-top text-xs">
                  <Verdict pass={v.allowed}>{v.allowed ? "Allowed" : "Blocked"}</Verdict>
                  {row.job === "control" ? <span className="block text-foreground/75">{v.allowed ? "Use allowed" : "Use refused"}; crawls nothing</span> : null}
                  {row.mayIgnoreRobots ? <span className="block text-foreground/75">Vendor says it may ignore the rules</span> : null}
                </TableCell>
                <TableCell className="min-w-48 align-top text-xs whitespace-normal text-foreground/85">{decidedBy(v, row.token)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="text-xs text-foreground/75">
        Bot names and jobs are from each vendor&apos;s documentation, checked 22 October 2026. Rules are matched the way Google documents; other
        crawlers can differ in details.
      </p>
    </div>
  );
}
