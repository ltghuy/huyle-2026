"use client";

import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { AudioButton } from "@/components/exercise/audio-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PATTERN_LABELS, type VerbEntry } from "@/learning/verbs";
import { cn } from "@/lib/utils";

const REGION = { us: "chỉ Mỹ", uk: "chỉ Anh" } as const;
const FORM_ROWS = [
  { key: "past", label: "Quá khứ (V2)" },
  { key: "participle", label: "Quá khứ phân từ (V3)" },
] as const;

interface VerbDialogProps {
  verb: VerbEntry | null;
  onClose: () => void;
  onPractise: (verb: VerbEntry) => void;
}

/** One verb: its forms with phonetic spelling, meaning, note and example sentences (AC-002, AC-003, AC-006). */
export function VerbDialog({ verb, onClose, onPractise }: VerbDialogProps) {
  return (
    <Dialog open={verb !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100svh-2rem)] gap-5 overflow-y-auto p-5 sm:max-w-lg">{verb ? <VerbDetails verb={verb} onPractise={onPractise} /> : null}</DialogContent>
    </Dialog>
  );
}

function VerbDetails({ verb, onPractise }: { verb: VerbEntry; onPractise: (verb: VerbEntry) => void }) {
  const { word, forms, pattern } = verb;
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl">
          <span lang="en">
            {word.body.headword} – {forms.body.past[0].text} – {forms.body.participle[0].text}
          </span>
          {forms.body.audio ? <AudioButton source="word" audioKey={forms.body.audio} label={`ba dạng của ${word.body.headword}`} /> : null}
        </DialogTitle>
        <DialogDescription className="text-base text-foreground">{word.body.meaningsVi.join("; ")}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary">{forms.level}</Badge>
        <Badge variant="outline">
          {PATTERN_LABELS[pattern].title} · {PATTERN_LABELS[pattern].hintVi}
        </Badge>
      </div>

      <dl className="grid gap-3">
        <div className="grid gap-0.5">
          <dt className="text-sm text-muted-foreground">Nguyên mẫu (V1)</dt>
          <dd lang="en">
            <span className="font-semibold">{word.body.headword}</span> {word.body.ipa ? <span className="ipa text-muted-foreground">{word.body.ipa}</span> : null}
          </dd>
        </div>
        {FORM_ROWS.map((row) => (
          <div key={row.key} className="grid gap-0.5">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="flex flex-wrap gap-x-4 gap-y-1" lang="en">
              {forms.body[row.key].map((form) => (
                <span key={form.text}>
                  <span className="font-semibold">{form.text}</span> {form.ipa ? <span className="ipa text-muted-foreground">{form.ipa}</span> : null}
                  {form.region ? (
                    <span className="ml-1 text-sm text-muted-foreground" lang="vi">
                      ({REGION[form.region]})
                    </span>
                  ) : null}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      {forms.body.noteVi ? <p className="rounded-lg bg-muted px-3 py-2 text-sm">{forms.body.noteVi}</p> : null}

      <section className="grid gap-2" aria-label="Ví dụ">
        <h3 className="font-medium">Ví dụ</h3>
        <ul className="grid gap-2">
          {forms.body.practice.map((sentence) => {
            const [before, after] = sentence.en.split("___");
            return (
              <li key={sentence.en} className="grid gap-0.5">
                <span lang="en">
                  {before}
                  <strong className="text-primary">{forms.body[sentence.answer][0].text}</strong>
                  {after}
                </span>
                <span className="text-sm text-muted-foreground">{sentence.vi}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button size="lg" className="h-11" onClick={() => onPractise(verb)}>
          <Dumbbell aria-hidden /> Luyện động từ này
        </Button>
        <Link href={`/vocabulary?word=${encodeURIComponent(word.id)}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}>
          Xem từ trong Từ vựng
        </Link>
      </div>
      <DialogClose render={<Button variant="ghost" className="h-11 w-full" />}>Đóng</DialogClose>
    </>
  );
}
