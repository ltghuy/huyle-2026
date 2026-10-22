"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CodeBlock } from "@/handbook/e2e/code-block";
import { Verdict } from "@/handbook/ui";

import { FieldSelect } from "../field-select";
import { FetchError } from "./fetch-error";
import { checkRobots, CRAWLERS, parseRobots, SAMPLE_ROBOTS } from "./robots-txt";
import { useText } from "./use-text";

function ruleText(rule: { allow: boolean; path: string }) {
  return `${rule.allow ? "Allow" : "Disallow"}: ${rule.path}`;
}

export function RobotsDemo() {
  const { load, retry } = useText("/robots.txt");
  const [text, setText] = useState(SAMPLE_ROBOTS);
  const [agent, setAgent] = useState<string>(CRAWLERS[0].value);
  const [rawPath, setRawPath] = useState("/seo/ai-search");
  const textId = useId();
  const pathId = useId();

  const fixed = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const parsed = parseRobots(text);
  const verdict = checkRobots(parsed, agent, fixed);

  function handleLoadLive() {
    if (load.state === "done") setText(load.text);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-medium text-foreground/75">This site&apos;s robots.txt, fetched now</p>
        {load.state === "loading" ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-foreground/75">Fetching /robots.txt…</p>
        ) : load.state === "error" ? (
          <FetchError what="/robots.txt" message={load.message} onRetry={retry} />
        ) : (
          <CodeBlock path={`/robots.txt (status ${load.status})`} code={load.text.trimEnd()} lang="text" />
        )}
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor={textId}>robots.txt to test</Label>
          <Textarea id={textId} value={text} onChange={(e) => setText(e.target.value)} rows={13} spellCheck={false} className="font-mono text-xs leading-relaxed" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setText(SAMPLE_ROBOTS)}>
              Sample rules
            </Button>
            <Button size="sm" variant="outline" disabled={load.state !== "done"} onClick={handleLoadLive}>
              This site&apos;s file
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <FieldSelect label="Crawler" value={agent} options={CRAWLERS} onChange={setAgent} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={pathId} className="text-xs">
              URL path
            </Label>
            <Input id={pathId} value={rawPath} onChange={(e) => setRawPath(e.target.value)} spellCheck={false} className="font-mono text-xs" />
            {fixed !== rawPath ? <p className="text-xs text-foreground/75">Paths start with &quot;/&quot;, so this tests {fixed}.</p> : null}
          </div>

          <div aria-live="polite" className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3 text-sm">
            <p className="flex flex-wrap items-center gap-x-2">
              <Verdict pass={verdict.allowed}>{verdict.allowed ? "Allowed" : "Blocked"}</Verdict>
              <span>
                {agent === "SomeOtherBot" ? "Any other crawler" : agent} {verdict.allowed ? "may fetch" : "may not fetch"} <code className="font-mono text-xs">{fixed}</code>.
              </span>
            </p>
            <p className="text-foreground/85">
              {verdict.matchedAgent === null
                ? "No group names this crawler and there is no * group, so every path is allowed."
                : verdict.matchedAgent === "*"
                  ? "No group names this crawler, so it follows the * group."
                  : `It follows the group for ${agent} and ignores the * group entirely${verdict.groups.length > 1 ? " (its groups are combined)" : ""}.`}
            </p>
            {verdict.matchedAgent !== null ? (
              <p className="text-foreground/85">
                {verdict.rule ? (
                  <>
                    Line {verdict.rule.line}, <code className="font-mono text-xs">{ruleText(verdict.rule)}</code>, wins
                    {verdict.candidates.length > 1
                      ? verdict.candidates[1].path.length === verdict.rule.path.length
                        ? ": it ties on length with another matching rule, and the less restrictive rule wins a tie."
                        : `: it's the longest of the ${verdict.candidates.length} matching rules.`
                      : ": it's the only rule that matches."}
                  </>
                ) : (
                  "No rule in the group matches this path, so it's allowed."
                )}
              </p>
            ) : null}
            {parsed.ignored.length > 0 ? (
              <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-xs text-foreground/80">
                {parsed.ignored.map((item) => (
                  <li key={item.line}>
                    Line {item.line} ignored ({item.text}): {item.why}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
      <p className="text-xs text-foreground/75">
        The tester follows Google&apos;s documented rules. Other crawlers can differ in details, and real crawlers also decode percent-encoded
        characters before matching, which this one doesn&apos;t.
      </p>
    </div>
  );
}
