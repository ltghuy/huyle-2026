"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type Kind = "audio" | "video-only" | "video";
type Timing = "recorded" | "live";
type Need = { what: string; level: "required-a" | "required-aa" | "recommended"; why: string };

const KINDS: { id: Kind; title: string }[] = [
  { id: "audio", title: "Audio only (a podcast)" },
  { id: "video-only", title: "Video without sound" },
  { id: "video", title: "Video with sound" },
];

const TIMINGS: { id: Timing; title: string }[] = [
  { id: "recorded", title: "Recorded" },
  { id: "live", title: "Live" },
];

const LEVEL_TEXT: Record<Need["level"], string> = {
  "required-a": "Required (WCAG A)",
  "required-aa": "Required (WCAG AA)",
  recommended: "Recommended",
};

// WCAG 2 success criteria 1.2.1–1.2.9.
const NEEDS: Record<Timing, Record<Kind, Need[]>> = {
  recorded: {
    audio: [
      { what: "Transcript", level: "required-a", why: "All speech and important sounds as text (1.2.1)." },
      { what: "Sign language", level: "recommended", why: "For people whose first language is signed (1.2.6, AAA)." },
    ],
    "video-only": [
      { what: "Transcript or audio track", level: "required-a", why: "Describes what happens on screen (1.2.1)." },
    ],
    video: [
      { what: "Captions", level: "required-a", why: "Speech and meaningful sounds, in sync (1.2.2)." },
      { what: "Audio description", level: "required-aa", why: "Narrates important visuals between the dialogue (1.2.5)." },
      { what: "Transcript", level: "recommended", why: "Read at your own pace, search, and indexed by search engines (1.2.8, AAA)." },
      { what: "Sign language", level: "recommended", why: "1.2.6, AAA." },
    ],
  },
  live: {
    audio: [{ what: "Live captions or a transcript", level: "recommended", why: "Nothing is required at AA; 1.2.9 (AAA) asks for a text alternative." }],
    "video-only": [{ what: "Describe key visuals in text", level: "recommended", why: "Nothing is required at AA for live video without sound." }],
    video: [
      { what: "Live captions", level: "required-aa", why: "Real-time captions by a person or a checked service (1.2.4)." },
      { what: "Transcript afterwards", level: "recommended", why: "Publish one with the recording." },
    ],
  },
};

export function MediaNeeds() {
  const [kind, setKind] = useState<Kind>("video");
  const [timing, setTiming] = useState<Timing>("recorded");

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-medium">Which alternatives does my media need?</h4>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <ChoiceGroup legend="Media" name="media-kind" options={KINDS} value={kind} onChange={setKind} />
        <ChoiceGroup legend="Timing" name="media-timing" options={TIMINGS} value={timing} onChange={setTiming} />
      </div>
      <ul aria-live="polite" className="flex flex-col gap-2">
        {NEEDS[timing][kind].map((need) => (
          <li key={need.what} className="flex flex-col gap-0.5 rounded-lg border p-3 text-sm sm:flex-row sm:items-baseline sm:gap-3">
            <span className="font-medium">{need.what}</span>
            <span className={cn("text-xs font-medium", need.level === "recommended" ? "text-foreground/75" : "text-foreground")}>
              {LEVEL_TEXT[need.level]}
            </span>
            <span className="text-xs text-foreground/75">{need.why}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: { id: T; title: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-xs font-medium text-foreground/75">{legend}</legend>
      {options.map((option) => (
        <label key={option.id} className="flex items-center gap-2 text-sm">
          <input type="radio" name={name} checked={value === option.id} onChange={() => onChange(option.id)} className="size-4 accent-primary" />
          {option.title}
        </label>
      ))}
    </fieldset>
  );
}
