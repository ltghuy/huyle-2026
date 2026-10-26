"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { useId, useState } from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";
import { Button } from "@/components/ui/button";
import { toast } from "@/practices/toast-notifications/toast-store";

import { simulatePosts } from "./feed-api";
import { FeedView } from "./feed-view";
import { useFeed } from "./use-feed";

const PAGE_SIZES = [10, 20, 50];
const DISTANCES = [0, 400, 1200];

async function createNewPosts() {
  try {
    const { created } = await simulatePosts();
    toast.success(`Created ${created} new posts on the server`, {
      description: "The next check will find them.",
    });
  } catch (error) {
    toast.error("Couldn't create posts", {
      description: error instanceof Error ? error.message : String(error),
    });
  }
}

export function Demo() {
  const [latency, setLatency] = useState(500);
  const [failPercent, setFailPercent] = useState(0);
  const [limit, setLimit] = useState(20);
  const [distance, setDistance] = useState(400);
  const [pollSec, setPollSec] = useState(10);
  const ids = { latency: useId(), fail: useId(), limit: useId(), distance: useId(), poll: useId() };

  const feed = useFeed({ limit, latencyMs: latency, failRate: failPercent / 100 }, pollSec * 1000);
  const { state } = feed;

  function handleSimulate() {
    void createNewPosts();
  }

  return (
    <>
      <DemoControls>
        <Range id={ids.latency} label="Latency" unit="ms" value={latency} min={0} max={3000} step={100} onChange={setLatency} />
        <Range id={ids.fail} label="Failure rate" unit="%" value={failPercent} min={0} max={100} step={10} onChange={setFailPercent} />
        <Select id={ids.limit} label="Page size" value={limit} options={PAGE_SIZES} format={(n) => `${n} posts`} onChange={setLimit} />
        <Select id={ids.distance} label="Trigger distance" value={distance} options={DISTANCES} format={(n) => `${n} px`} onChange={setDistance} />
        <Range id={ids.poll} label="Check every" unit="s" value={pollSec} min={5} max={60} step={5} onChange={setPollSec} />
        <Button variant="outline" size="sm" onClick={handleSimulate}>
          <Sparkles aria-hidden /> Simulate new posts
        </Button>
        <Button variant="ghost" size="sm" onClick={feed.reset}>
          <RotateCcw aria-hidden /> Reset feed
        </Button>
        <p className="w-full font-mono text-xs text-muted-foreground tabular-nums">
          Requests: {state.requests} · Posts loaded: {state.posts.length} · Total on server:{" "}
          {state.total ?? "?"}
        </p>
      </DemoControls>

      <DemoStage>
        <FeedView feed={feed} distance={distance} />
      </DemoStage>
    </>
  );
}

function Range({
  id, label, unit, value, min, max, step, onChange,
}: {
  id: string; label: string; unit: string; value: number; min: number; max: number; step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}: {value}
        {unit}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-32 accent-primary"
      />
    </div>
  );
}

function Select({
  id, label, value, options, format, onChange,
}: {
  id: string; label: string; value: number; options: number[]; format: (n: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 rounded-md border bg-background px-2 text-sm"
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {format(n)}
          </option>
        ))}
      </select>
    </div>
  );
}
