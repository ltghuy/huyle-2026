"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Verdict } from "@/handbook/ui";
import { JOB_LABEL, type BotJob } from "@/lib/ai-bots";

import { FetchError } from "../crawling/fetch-error";
import { checkRobots, parseRobots } from "../crawling/robots-txt";
import { useText } from "../crawling/use-text";
import { identify, inRange, parseLog, SAMPLE_LOG, SAMPLE_RANGES } from "./access-log";

const JOBS: BotJob[] = ["training", "search", "user"];

export function LogDemo() {
  const robots = useText("/robots.txt");
  const [text, setText] = useState(SAMPLE_LOG);
  const textId = useId();

  const rules = parseRobots(robots.load.state === "done" ? robots.load.text : "");
  const log = parseLog(text);
  const rows = log.lines.map((entry) => {
    const bot = identify(entry.agent);
    const range = bot ? SAMPLE_RANGES[bot.vendor] : undefined;
    const spoofed = range !== undefined && !inRange(entry.ip, range);
    // robots.txt itself is always fetchable: it's where the rules are read.
    const verdict = bot && entry.path !== "/robots.txt" ? checkRobots(rules, bot.token, entry.path) : null;
    return { entry, bot, range, spoofed, disallowed: verdict !== null && !verdict.allowed, rule: verdict?.rule ?? null };
  });
  const genuine = rows.filter((r) => r.bot !== null && !r.spoofed);
  const counts = [
    ...JOBS.map((job) => ({ label: JOB_LABEL[job], n: genuine.filter((r) => r.bot?.job === job && !r.bot.searchEngine).length })),
    { label: "Search engine", n: genuine.filter((r) => r.bot?.searchEngine).length },
    { label: "Fake bot", n: rows.filter((r) => r.spoofed).length },
  ];
  const humans = rows.filter((r) => r.bot === null).length;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {robots.load.state === "error" ? <FetchError what="/robots.txt" message={robots.load.message} onRetry={robots.retry} /> : null}
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={textId}>Access log (sample data; paste your own lines in the combined format)</Label>
        <Textarea id={textId} value={text} onChange={(e) => setText(e.target.value)} rows={8} spellCheck={false} wrap="off" className="font-mono text-xs leading-relaxed" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setText(SAMPLE_LOG)}>
            Sample log
          </Button>
        </div>
      </div>

      <div aria-live="polite" className="flex min-w-0 flex-col gap-3">
        <ul className="flex flex-wrap gap-2 text-xs">
          {counts.map(({ label, n }) => (
            <li key={label} className="rounded-md border px-2 py-1">
              {label}: <span className="font-medium tabular-nums">{n}</span>
            </li>
          ))}
          <li className="rounded-md border px-2 py-1">
            Not a known bot: <span className="font-medium tabular-nums">{humans}</span>
          </li>
          <li className="rounded-md border px-2 py-1">
            Unparsed: <span className="font-medium tabular-nums">{log.unparsed.length}</span>
          </li>
        </ul>

        <Table aria-label="Requests in the log">
          <TableHeader>
            <TableRow>
              <TableHead>Line</TableHead>
              <TableHead>Claims to be</TableHead>
              <TableHead>Request</TableHead>
              <TableHead>Findings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ entry, bot, range, spoofed, disallowed, rule }) => (
              <TableRow key={entry.line}>
                <TableCell className="align-top text-xs tabular-nums">{entry.line}</TableCell>
                <TableCell className="align-top text-xs">
                  {bot ? (
                    <>
                      <span className="font-mono">{bot.token}</span>
                      <span className="block text-foreground/75">
                        {bot.vendor}, {bot.searchEngine ? "search engine" : JOB_LABEL[bot.job]}
                      </span>
                    </>
                  ) : (
                    <span className="text-foreground/75">Not a known bot</span>
                  )}
                </TableCell>
                <TableCell className="align-top text-xs">
                  <span className="font-mono">{entry.path}</span>
                  <span className="block font-mono text-foreground/75">{entry.ip}</span>
                </TableCell>
                <TableCell className="min-w-56 align-top text-xs whitespace-normal">
                  {bot === null ? (
                    <span className="text-foreground/80">Nothing to check</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {range === undefined ? (
                        <span className="text-foreground/80">No sample range for {bot.vendor}, so the address isn&apos;t checked</span>
                      ) : (
                        <Verdict pass={!spoofed}>{spoofed ? `Address outside ${bot.vendor}'s range ${range}: not really ${bot.token}` : `Address in ${bot.vendor}'s range`}</Verdict>
                      )}
                      {disallowed && !spoofed ? (
                        <Verdict pass={false}>
                          Fetched a path this site disallows for it{rule ? ` (line ${rule.line})` : ""}
                          {bot.mayIgnoreRobots ? "; its vendor says it may ignore the rules" : ""}
                        </Verdict>
                      ) : null}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {log.unparsed.length > 0 ? (
          <ul className="flex flex-col gap-0.5 text-xs text-foreground/80">
            {log.unparsed.map((u) => (
              <li key={u.line}>
                Line {u.line} isn&apos;t in the combined format: <span className="font-mono">{u.text}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="text-xs text-foreground/75">
        The log and the address ranges are sample data (RFC 5737 documentation networks). Real checks use each vendor&apos;s published IP list, such
        as OpenAI&apos;s gptbot.json, or a reverse DNS lookup. Rules come from this site&apos;s robots.txt, fetched now.
      </p>
    </div>
  );
}
