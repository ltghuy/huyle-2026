"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookX, CheckCircle2, Dumbbell, Plus, Shuffle, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { ContentItemOf } from "@/content/schema";
import { newCard } from "@/learning/srs";
import type { CardItemId } from "@/learning/types";
import { TOPICS_USING_FORMS } from "@/learning/verbs";
import type { ContentIndex } from "@/lib/session/content-index";
import { getCard, putCards } from "@/storage/cards";
import { AudioButton } from "@/components/exercise/audio-button";
import { ExerciseRun } from "@/components/library/exercise-run";
import { grammarPracticeSteps } from "@/components/library/exercise-sets";
import { EmptyState } from "@/components/shell/load-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Grammar = ContentItemOf<"grammar">;
type Sentence = ContentItemOf<"sentence">;

const FORM_LABELS: Record<Grammar["body"]["pattern"][number]["form"], string> = {
  affirmative: "Khẳng định",
  negative: "Phủ định",
  question: "Nghi vấn",
};

/** Adds the topic to the review schedule unless it's already there (AC-013, AC-025). */
async function ensureGrammarCard(id: CardItemId): Promise<void> {
  if (await getCard(id)) return;
  await putCards([newCard(id, Date.now())]);
}

function BackLink() {
  return (
    <Link href="/grammar" className="inline-flex min-h-11 items-center gap-2 justify-self-start rounded-lg pr-3 text-sm font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <ArrowLeft className="size-4" aria-hidden /> Tất cả chủ điểm
    </Link>
  );
}

interface GrammarTopicProps {
  grammar: Grammar | null;
  index: ContentIndex;
  done: boolean;
  onCardsChanged: () => void;
}

/** One grammar topic: rule, pattern, usage, signal words, mistakes, examples and practice (AC-024). */
export function GrammarTopic({ grammar, index, done, onCardsChanged }: GrammarTopicProps) {
  const [practicing, setPracticing] = useState(false);
  const buildSteps = useCallback((round: number) => (grammar ? grammarPracticeSteps(grammar, index, round) : []), [grammar, index]);

  if (!grammar) {
    return (
      <div className="grid gap-4 px-4 md:px-8">
        <BackLink />
        <EmptyState icon={BookX} title="Bài ngữ pháp này chưa có">
          <p className="text-sm text-muted-foreground">Có thể bài đang được biên soạn. Bạn chọn một chủ điểm khác nhé.</p>
        </EmptyState>
      </div>
    );
  }

  const { body } = grammar;
  const examples = body.examples.map((id) => index.byId.get(id)).filter((item): item is Sentence => item?.kind === "sentence");
  const cardId = grammar.id as CardItemId;

  async function handleFinished() {
    try {
      await ensureGrammarCard(cardId);
      onCardsChanged();
    } catch {
      toast.error("Chưa lưu được tiến độ. Bạn thử lại nhé.");
    }
  }

  async function handleMarkLearned() {
    await handleFinished();
    toast.success("Đã thêm chủ điểm vào lịch Ôn tập.");
  }

  return (
    <article className="mx-auto grid w-full max-w-3xl gap-6 px-4 md:px-8" aria-labelledby="grammar-title">
      <BackLink />
      <header className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{grammar.level}</Badge>
          {done ? (
            <Badge variant="secondary">
              <CheckCircle2 className="text-success" aria-hidden /> Đã học
            </Badge>
          ) : null}
        </div>
        <h2 id="grammar-title" className="text-3xl font-semibold" lang="en">
          {body.titleEn}
        </h2>
        <p className="text-lg text-muted-foreground">{body.titleVi}</p>
      </header>

      <Section title="Quy tắc">
        <p className="text-lg">{body.ruleVi}</p>
      </Section>

      <FormsLink slug={grammar.id.slice("grammar:".length)} />

      <Section title="Cấu trúc">
        <dl className="grid gap-2">
          {body.pattern.map((pattern) => (
            <div key={`${pattern.form}-${pattern.en}`} className="grid gap-1 rounded-xl bg-muted px-4 py-3 sm:grid-cols-[8rem_1fr] sm:items-center">
              <dt className="text-sm text-muted-foreground">{FORM_LABELS[pattern.form]}</dt>
              <dd className="text-lg font-medium" lang="en">
                {pattern.en}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Khi nào dùng">
        <ul className="grid list-disc gap-1 pl-5">
          {body.usageVi.map((usage) => (
            <li key={usage}>{usage}</li>
          ))}
        </ul>
      </Section>

      {body.signalWords.length > 0 ? (
        <Section title="Dấu hiệu nhận biết">
          <ul className="flex flex-wrap gap-2">
            {body.signalWords.map((word) => (
              <li key={word} className="rounded-full border px-3 py-1" lang="en">
                {word}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {body.mistakes.length > 0 ? (
        <Section title="Lỗi thường gặp">
          <ul className="grid gap-3">
            {body.mistakes.map((mistake) => (
              <li key={mistake.wrong} className="grid gap-2 rounded-xl border p-4">
                <p className="flex items-start gap-2">
                  <XCircle className="mt-1 size-4 shrink-0 text-destructive" aria-hidden />
                  <span className="sr-only">Sai:</span>
                  <span className="line-through decoration-destructive/60" lang="en">
                    {mistake.wrong}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <ArrowRight className="mt-1 size-4 shrink-0 text-success" aria-hidden />
                  <span className="sr-only">Đúng:</span>
                  <span className="font-medium" lang="en">
                    {mistake.right}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">{mistake.explanationVi}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {examples.length > 0 ? (
        <Section title="Ví dụ">
          <ul className="grid gap-2">
            {examples.map((example) => (
              <li key={example.id} className="flex items-start gap-3 rounded-xl bg-muted p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-lg" lang="en">
                    {example.body.en}
                  </p>
                  <p className="mt-1 text-muted-foreground">{example.body.vi}</p>
                </div>
                <AudioButton source="sentence" audioKey={example.body.audio} label={example.body.en} className="size-11" />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {body.practice.length > 0 || !done ? (
        <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          {body.practice.length > 0 ? (
            <Button size="lg" className="h-12 w-full text-base sm:w-auto sm:px-8" onClick={() => setPracticing(true)}>
              <Dumbbell aria-hidden /> Luyện tập
            </Button>
          ) : (
            <Button size="lg" className="h-12 w-full text-base sm:w-auto sm:px-8" onClick={handleMarkLearned}>
              <Plus aria-hidden /> Đánh dấu đã học
            </Button>
          )}
        </div>
      ) : null}

      {practicing ? (
        <ExerciseRun
          title={`Luyện tập: ${body.titleVi}`}
          buildSteps={buildSteps}
          onFinished={handleFinished}
          onClose={() => setPracticing(false)}
          doneLabel="Về bài học"
        />
      ) : null}
    </article>
  );
}

const FORM_USE = { past: "dạng quá khứ (V2)", participle: "quá khứ phân từ (V3)" } as const;

/** For tenses built on an irregular verb form: where to learn those forms (feature 008, AC-012). */
function FormsLink({ slug }: { slug: string }) {
  const form = TOPICS_USING_FORMS[slug];
  if (!form) return null;
  return (
    <Link
      href="/irregular-verbs"
      className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Shuffle className="size-5 shrink-0 text-primary" aria-hidden />
      <span className="flex-1">
        Thì này dùng {FORM_USE[form]} của động từ. Với động từ bất quy tắc, xem bảng <span className="font-medium text-primary">Động từ bất quy tắc</span>.
      </span>
      <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}
