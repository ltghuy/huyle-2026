"use client";

import { useId, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { FieldSelect } from "../field-select";
import { FILTER_ORDER, FILTERS, outcome, PRODUCTS, STRATEGY_LABEL, urlCounts, type FilterKey, type Picked, type Strategy } from "./facets";

const ANY = "any";

const STRATEGY_OPTIONS = (Object.keys(STRATEGY_LABEL) as Strategy[]).map((value) => ({ value, label: STRATEGY_LABEL[value] }));

const COUNTS = urlCounts();

const optionsFor = (key: FilterKey) => [{ value: ANY, label: "Any" }, ...FILTERS[key].map((v) => ({ value: v, label: v }))];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <dt className="text-xs font-medium text-foreground/75">{label}</dt>
      <dd className="min-w-0 font-mono text-xs break-words">{value}</dd>
    </div>
  );
}

export function FacetsDemo() {
  // In the order the learner picked them, which is how a careless site builds its links.
  const [picked, setPicked] = useState<Picked>([
    { key: "size", value: "40" },
    { key: "color", value: "black" },
  ]);
  const [sort, setSort] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>("indexable");
  const sortId = useId();

  const result = outcome(picked, sort, strategy);

  function handleFilter(key: FilterKey, value: string) {
    setPicked((current) => {
      const rest = current.filter((p) => p.key !== key);
      if (value === ANY) return rest;
      const at = current.findIndex((p) => p.key === key);
      // Changing a value keeps its place; a new filter goes last.
      return at === -1 ? [...rest, { key, value }] : current.map((p) => (p.key === key ? { key, value } : p));
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FILTER_ORDER.map((key) => (
          <FieldSelect key={key} label={key[0].toUpperCase() + key.slice(1)} value={picked.find((p) => p.key === key)?.value ?? ANY} options={optionsFor(key)} onChange={(v) => handleFilter(key, v)} />
        ))}
        <FieldSelect label="Strategy" value={strategy} options={STRATEGY_OPTIONS} onChange={setStrategy} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id={sortId} checked={sort} onCheckedChange={(next) => setSort(next === true)} />
        <Label htmlFor={sortId} className="text-xs font-normal">
          Sort by price
        </Label>
      </div>

      <div aria-live="polite" className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted/40 p-3">
        <dl className="flex min-w-0 flex-col gap-2">
          <Row label="The site links to" value={result.linked} />
          <Row label="Normalized" value={result.normalized} />
          <Row label="Products shown" value={`${result.matches} of ${PRODUCTS.length}`} />
          <Row label="Crawler" value={result.crawled} />
          <Row label="Status" value={result.status} />
          <Row label="Canonical" value={result.canonical} />
        </dl>
        {result.notes.map((n) => (
          <p key={n} className="text-xs text-foreground/85">
            {n}
          </p>
        ))}
      </div>
      <p className="text-sm">
        With three filters and one sort, this catalogue of {PRODUCTS.length} products can produce{" "}
        <span className="font-medium tabular-nums">{COUNTS.fixed}</span> filter URLs when parameters always come in the same order, and{" "}
        <span className="font-medium tabular-nums">{COUNTS.anyOrder}</span> when links use whatever order the filters were picked in.
      </p>
      <p className="text-xs text-foreground/75">Sample data. The strategies follow Google&apos;s faceted navigation guide.</p>
    </div>
  );
}
