"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { answers, fanOut, match, terms, type PageRules, type SiteRules } from "./answer-model";

const QUESTIONS = ["How do I block AI training crawlers?", "What is a soft 404 and how do I avoid it?", "How should I virtualize a large list in React?"] as const;

const SITE_CONTROLS: { key: keyof SiteRules; label: string }[] = [
  { key: "googlebot", label: "Googlebot allowed" },
  { key: "oaiSearch", label: "OAI-SearchBot allowed" },
  { key: "claudeSearch", label: "Claude-SearchBot allowed" },
  { key: "gptbot", label: "GPTBot allowed (training)" },
];

const NO_RULES: PageRules = { noindex: false, nosnippet: false };

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(next) => onChange(next === true)} />
      <Label htmlFor={id} className="text-xs font-normal">
        {label}
      </Label>
    </div>
  );
}

export function AnswerDemo() {
  const [question, setQuestion] = useState<string>(QUESTIONS[0]);
  const [site, setSite] = useState<SiteRules>({ googlebot: true, oaiSearch: true, claudeSearch: true, gptbot: false });
  const [rules, setRules] = useState<Record<string, PageRules>>({});
  const baseId = useId();

  const keyTerms = terms(question);
  const searches = keyTerms.length > 0 ? fanOut(question, keyTerms) : [];
  const matches = match(keyTerms);
  const results = answers(matches, site, rules);

  function handleSite(key: keyof SiteRules, checked: boolean) {
    setSite((s) => ({ ...s, [key]: checked }));
  }

  function handlePage(path: string, key: keyof PageRules, checked: boolean) {
    setRules((r) => ({ ...r, [path]: { ...(r[path] ?? NO_RULES), [key]: checked } }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={`${baseId}-q`} className="text-xs">
          Question
        </Label>
        <Input id={`${baseId}-q`} value={question} onChange={(e) => setQuestion(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {QUESTIONS.map((q) => (
            <Button key={q} size="sm" variant="outline" onClick={() => setQuestion(q)}>
              {q}
            </Button>
          ))}
        </div>
      </div>

      <fieldset className="flex flex-wrap gap-x-5 gap-y-2 rounded-lg border p-3">
        <legend className="px-1 text-xs font-medium">This site&apos;s robots.txt</legend>
        {SITE_CONTROLS.map((c) => (
          <Toggle key={c.key} id={`${baseId}-${c.key}`} label={c.label} checked={site[c.key]} onChange={(checked) => handleSite(c.key, checked)} />
        ))}
      </fieldset>

      <div aria-live="polite" className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-xs font-medium text-foreground/75">Related searches the engine runs</p>
          {searches.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {searches.map((s) => (
                <li key={s} className="rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs">
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/80">Type a question to see the searches.</p>
          )}
        </div>

        {matches.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-foreground/80">No page of this site matches these words, so no engine would cite this site.</p>
        ) : (
          <>
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-xs font-medium text-foreground/75">Pages of this site that match, best first</p>
              <ul className="flex flex-col divide-y rounded-lg border">
                {matches.map((m) => {
                  const r = rules[m.page.path] ?? NO_RULES;
                  return (
                    <li key={m.page.path} className="flex min-w-0 flex-col gap-1.5 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <Link href={m.page.path} className="text-sm font-medium text-link underline-offset-4 hover:underline">
                          {m.page.title}
                        </Link>
                        <p className="text-xs text-foreground/75">Matches: {m.terms.join(", ")}</p>
                      </div>
                      <div className="flex shrink-0 gap-4">
                        <Toggle id={`${baseId}-${m.page.path}-noindex`} label="noindex" checked={r.noindex} onChange={(checked) => handlePage(m.page.path, "noindex", checked)} />
                        <Toggle id={`${baseId}-${m.page.path}-nosnippet`} label="nosnippet" checked={r.nosnippet} onChange={(checked) => handlePage(m.page.path, "nosnippet", checked)} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="grid min-w-0 gap-3 lg:grid-cols-3">
              {results.map((a) => (
                <section key={a.engine.id} aria-label={a.engine.name} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
                  <h4 className="text-sm font-medium">{a.engine.name}</h4>
                  {a.cited.length > 0 ? (
                    <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
                      {a.cited.map((m) => (
                        <li key={m.page.path}>{m.page.title}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-foreground/80">Cites nothing from this site.</p>
                  )}
                  {a.excluded.length > 0 ? (
                    <ul className="flex flex-col gap-1 border-t pt-2 text-xs text-foreground/80">
                      {a.excluded.map(({ match: m, why }) => (
                        <li key={m.page.path}>
                          Not cited, {m.page.title}: {why}.
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-foreground/75">
        A simplified model: pages match on the words of their title and summary, and each engine cites up to three. Google documents that its AI
        features use the normal index and snippet rules. OpenAI and Anthropic document only their crawlers, so the model ignores noindex and
        nosnippet for them. GPTBot is a training crawler and never changes an answer.
      </p>
    </div>
  );
}
