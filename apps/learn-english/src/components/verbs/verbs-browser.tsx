"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpenText, Dumbbell, Search, SearchX } from "lucide-react";
import { AudioButton } from "@/components/exercise/audio-button";
import { ExerciseRun } from "@/components/library/exercise-run";
import { ContentError, EmptyState, ListSkeleton } from "@/components/shell/load-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useVerbs } from "@/hooks/use-verbs";
import { filterVerbs, PATTERN_LABELS, VERB_PATTERNS, type VerbEntry, type VerbPattern } from "@/learning/verbs";
import { LEVELS } from "@/learning/types";
import { parseLevel, updateSearchParams } from "@/lib/search-params";
import { verbPracticeSteps } from "./verb-practice";
import { VerbDialog } from "./verb-dialog";

const ALL = "all";

const parsePattern = (value: string | null): VerbPattern | null => VERB_PATTERNS.find((pattern) => pattern === value) ?? null;

type Run = { title: string; verbs: VerbEntry[] };

/**
 * The irregular verbs section (feature 008, AC-001–AC-007): search, level
 * and pattern filters, a table on wide screens and cards on phones, the
 * verb dialog and practice for the current filter. Level, pattern and the
 * open verb live in the address (`?level=A1&pattern=ABC&verb=go-v`).
 */
export function VerbsBrowser() {
  const searchParams = useSearchParams();
  const level = parseLevel(searchParams.get("level"));
  const pattern = parsePattern(searchParams.get("pattern"));
  const openSlug = searchParams.get("verb");
  const [query, setQuery] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const verbs = useVerbs();

  const all = useMemo(() => (verbs.status === "ready" ? verbs.verbs : []), [verbs]);
  const shown = useMemo(() => filterVerbs(all, { pattern, level, query }), [all, pattern, level, query]);
  const open = openSlug ? (all.find((verb) => verb.forms.id === `forms:${openSlug}`) ?? null) : null;
  const buildSteps = useCallback((round: number) => verbPracticeSteps(run?.verbs ?? [], round), [run]);

  function handleLevelChange(next: string) {
    updateSearchParams({ level: next === ALL ? null : next });
  }

  function handlePatternChange(values: string[]) {
    const next = values[0];
    updateSearchParams({ pattern: !next || next === ALL ? null : next });
  }

  function handleOpen(verb: VerbEntry) {
    updateSearchParams({ verb: verb.forms.id.slice("forms:".length) }, "push");
  }

  function handleClose() {
    updateSearchParams({ verb: null });
  }

  function handlePractiseOne(verb: VerbEntry) {
    handleClose();
    setRun({ title: `Động từ ${verb.word.body.headword}`, verbs: [verb] });
  }

  function handlePractiseShown() {
    const parts = [level, pattern ? PATTERN_LABELS[pattern].title : null].filter(Boolean);
    setRun({ title: `Động từ bất quy tắc${parts.length ? `: ${parts.join(", ")}` : ""}`, verbs: shown });
  }

  if (verbs.status === "error") return <ContentError onRetry={verbs.retry} />;
  if (verbs.status === "loading") return <ListSkeleton rows={6} />;
  if (all.length === 0) {
    return (
      <EmptyState icon={BookOpenText} title="Phần này đang được biên soạn">
        <p className="text-sm text-muted-foreground">Danh sách động từ bất quy tắc sẽ có sớm. Bạn quay lại sau nhé.</p>
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-5 px-4 md:px-8">
      <section className="grid gap-4" aria-label="Bộ lọc">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm động từ, ví dụ: went hoặc đi"
            aria-label="Tìm động từ"
            className="h-11 pl-9"
          />
        </div>

        <Tabs value={level ?? ALL} onValueChange={(next) => handleLevelChange(String(next))}>
          <TabsList aria-label="Trình độ" className="w-full group-data-horizontal/tabs:h-11 sm:w-fit">
            <TabsTrigger value={ALL} className="px-2 text-base sm:px-3">
              Tất cả
            </TabsTrigger>
            {LEVELS.map((item) => (
              <TabsTrigger key={item} value={item} className="px-2 text-base sm:min-w-14 sm:px-3">
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid gap-2">
          <ToggleGroup aria-label="Lọc theo kiểu biến đổi" value={[pattern ?? ALL]} onValueChange={handlePatternChange} className="flex flex-wrap justify-start gap-2">
            <PatternChip value={ALL} title="Tất cả" />
            {VERB_PATTERNS.map((item) => (
              <PatternChip key={item} value={item} title={PATTERN_LABELS[item].title} example={PATTERN_LABELS[item].example} />
            ))}
          </ToggleGroup>
          <p className="text-sm text-muted-foreground">
            {pattern ? `${PATTERN_LABELS[pattern].hintVi} Ví dụ: ${PATTERN_LABELS[pattern].example}.` : "Học theo nhóm cách biến đổi giúp bạn nhớ nhanh hơn."}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" role="status">
          {shown.length} động từ
        </p>
        <Button size="lg" className="h-11 px-5" onClick={handlePractiseShown} disabled={shown.length === 0}>
          <Dumbbell aria-hidden /> Luyện tập
        </Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title="Không tìm thấy động từ nào">
          <p className="text-sm text-muted-foreground">Bạn thử từ khác hoặc bỏ bớt bộ lọc nhé.</p>
        </EmptyState>
      ) : (
        <>
          <VerbTable verbs={shown} onOpen={handleOpen} />
          <ul className="grid gap-3 md:hidden" aria-label="Danh sách động từ">
            {shown.map((verb) => (
              <VerbCard key={verb.forms.id} verb={verb} onOpen={handleOpen} />
            ))}
          </ul>
        </>
      )}

      <VerbDialog verb={open} onClose={handleClose} onPractise={handlePractiseOne} />
      {run ? <ExerciseRun key={run.title} shuffled title={run.title} buildSteps={buildSteps} onClose={() => setRun(null)} doneLabel="Về danh sách động từ" /> : null}
    </div>
  );
}

function PatternChip({ value, title, example }: { value: string; title: string; example?: string }) {
  return (
    <ToggleGroupItem
      value={value}
      aria-label={example ? `${title}, ví dụ ${example}` : title}
      className="h-11 rounded-full border border-transparent bg-muted/70 px-4 font-normal hover:border-border aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground"
    >
      <span className="font-medium">{title}</span>
      {example ? (
        <span className="hidden text-muted-foreground sm:inline in-aria-pressed:text-primary-foreground/80" lang="en">
          {example}
        </span>
      ) : null}
    </ToggleGroupItem>
  );
}

function Forms({ forms }: { forms: { text: string }[] }) {
  return <span lang="en">{forms.map((form) => form.text).join(" / ")}</span>;
}

/** Wide screens: one row per verb; the base form opens the dialog. */
function VerbTable({ verbs, onOpen }: { verbs: readonly VerbEntry[]; onOpen: (verb: VerbEntry) => void }) {
  return (
    <div className="hidden rounded-xl border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Nguyên mẫu (V1)</TableHead>
            <TableHead>Quá khứ (V2)</TableHead>
            <TableHead>Quá khứ phân từ (V3)</TableHead>
            <TableHead>Nghĩa</TableHead>
            <TableHead>Trình độ</TableHead>
            <TableHead className="w-14 pr-4">
              <span className="sr-only">Nghe</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {verbs.map((verb) => (
            <TableRow key={verb.forms.id}>
              <TableCell className="pl-4">
                <button type="button" onClick={() => onOpen(verb)} className="min-h-11 text-left text-base font-semibold text-primary underline-offset-4 hover:underline" lang="en">
                  {verb.word.body.headword}
                </button>
              </TableCell>
              <TableCell className="text-base">
                <Forms forms={verb.forms.body.past} />
              </TableCell>
              <TableCell className="text-base">
                <Forms forms={verb.forms.body.participle} />
              </TableCell>
              <TableCell className="max-w-64 truncate text-muted-foreground">{verb.word.body.meaningsVi.join("; ")}</TableCell>
              <TableCell>
                <Badge variant="secondary">{verb.forms.level}</Badge>
              </TableCell>
              <TableCell className="pr-4">
                {verb.forms.body.audio ? <AudioButton source="word" audioKey={verb.forms.body.audio} label={`ba dạng của ${verb.word.body.headword}`} /> : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Phones: a card per verb; the whole card opens the dialog, the play button stays separate. */
function VerbCard({ verb, onOpen }: { verb: VerbEntry; onOpen: (verb: VerbEntry) => void }) {
  const { word, forms } = verb;
  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <button type="button" onClick={() => onOpen(verb)} className="grid min-w-0 flex-1 gap-1 text-left">
        <span className="text-lg font-semibold" lang="en">
          {word.body.headword} – <Forms forms={forms.body.past} /> – <Forms forms={forms.body.participle} />
        </span>
        <span className="truncate text-sm text-muted-foreground">{word.body.meaningsVi.join("; ")}</span>
      </button>
      <Badge variant="secondary">{forms.level}</Badge>
      {forms.body.audio ? <AudioButton source="word" audioKey={forms.body.audio} label={`ba dạng của ${word.body.headword}`} /> : null}
    </li>
  );
}
