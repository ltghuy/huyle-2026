"use client";

import { useState } from "react";

import { Toggle } from "@/handbook/ui";
import { Choice } from "@/handbook/jwt/token-view";

import { PRODUCTS } from "./framework";

const PRODUCT_OPTIONS = PRODUCTS.map((p) => ({ value: p.id, label: p.name }));

export function RequirementsDemo() {
  const [productId, setProductId] = useState(PRODUCTS[0].id);
  const [showQuestions, setShowQuestions] = useState(true);

  const product = PRODUCTS.find((p) => p.id === productId)!;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Choice legend="Scope this product" value={productId} options={PRODUCT_OPTIONS} onChange={setProductId} />
        <Toggle checked={showQuestions} onCheckedChange={setShowQuestions} title="Show clarifying questions" detail="What to ask before designing." />
      </div>

      <p className="text-sm text-foreground/85">{product.brief}</p>

      <div className="grid gap-3 lg:grid-cols-2">
        <section aria-label="Functional requirements" className="flex flex-col gap-2 rounded-lg border p-3">
          <h4 className="text-sm font-medium">Functional (what it does)</h4>
          <ul className="flex flex-col gap-1 pl-4 text-sm text-foreground/85">
            {product.functional.map((item) => (
              <li key={item} className="list-disc">
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section aria-label="Non-functional requirements" className="flex flex-col gap-2 rounded-lg border p-3">
          <h4 className="text-sm font-medium">Non-functional (how well)</h4>
          <dl className="flex flex-col gap-1.5 text-sm">
            {product.nonFunctional.map((nf) => (
              <div key={nf.axis} className="grid grid-cols-[7rem_1fr] gap-x-2">
                <dt className="font-medium text-info">{nf.axis}</dt>
                <dd className="text-foreground/85">{nf.note}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {showQuestions ? (
        <section aria-label="Clarifying questions" className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
          <h4 className="text-sm font-medium">Ask first</h4>
          <ul className="flex flex-col gap-1 pl-4 text-sm text-foreground/85">
            {product.questions.map((q) => (
              <li key={q} className="list-disc">
                {q}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-foreground/75">
        The non-functional bar and the scope cuts shape the design as much as the feature list: the same {product.name.toLowerCase()} is a different build offline-first, or SEO-critical, or for a watch.
      </p>
    </div>
  );
}
