"use client";

import type { ContentItemOf } from "@/content/schema";
import { AudioButton } from "./audio-button";

export type StudyItem = ContentItemOf<"word"> | ContentItemOf<"grammar">;

/** New material shown before it is checked: a word card or a grammar summary. */
export function StudyCard({ item, examples }: { item: StudyItem; examples: ContentItemOf<"sentence">[] }) {
  if (item.kind === "word") {
    const { body } = item;
    return (
      <article className="grid gap-5" aria-label={`Từ mới: ${body.headword}`}>
        <p className="text-sm font-medium text-primary">Từ mới</p>
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-4xl font-semibold" lang="en">
              {body.headword}
            </h2>
            <p className="mt-1 text-muted-foreground">
              <span className="ipa">{body.ipa}</span> · <span lang="en">{body.pos}</span>
            </p>
          </div>
          <AudioButton source="word" audioKey={body.audio} label={body.headword} size="lg" />
        </div>
        <ul className="grid gap-1 text-xl">
          {body.meaningsVi.map((meaning) => (
            <li key={meaning}>{meaning}</li>
          ))}
        </ul>
        {examples.map((example) => (
          <div key={example.id} className="flex items-start gap-3 rounded-xl bg-muted p-4">
            <div className="min-w-0 flex-1">
              <p className="text-lg" lang="en">
                {example.body.en}
              </p>
              <p className="mt-1 text-muted-foreground">{example.body.vi}</p>
            </div>
            <AudioButton source="sentence" audioKey={example.body.audio} label={example.body.en} />
          </div>
        ))}
      </article>
    );
  }

  const { body } = item;
  return (
    <article className="grid gap-5" aria-label={`Ngữ pháp: ${body.titleVi}`}>
      <p className="text-sm font-medium text-primary">Ngữ pháp mới</p>
      <div>
        <h2 className="text-3xl font-semibold" lang="en">
          {body.titleEn}
        </h2>
        <p className="mt-1 text-muted-foreground">{body.titleVi}</p>
      </div>
      <p className="text-lg">{body.ruleVi}</p>
      <ul className="grid gap-2">
        {body.pattern.map((pattern) => (
          <li key={pattern.form} className="rounded-lg bg-muted px-4 py-2 font-medium" lang="en">
            {pattern.en}
          </li>
        ))}
      </ul>
      {examples.slice(0, 2).map((example) => (
        <div key={example.id} className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg" lang="en">
              {example.body.en}
            </p>
            <p className="text-muted-foreground">{example.body.vi}</p>
          </div>
          <AudioButton source="sentence" audioKey={example.body.audio} label={example.body.en} />
        </div>
      ))}
    </article>
  );
}
