"use client";

import { ChevronDown, ShoppingBasket } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { announce } from "./a11y-reader";
import { ReaderBox, Toggle, WrongWay } from "./ui";

type LogLine = { id: number; text: string; silent?: boolean };

const MAX_LOG = 8;
let nextLineId = 0;

function withLine(log: LogLine[], text: string, silent = false) {
  return [{ id: nextLineId++, text, silent }, ...log].slice(0, MAX_LOG);
}

export function DynamicDemo() {
  const [liveRegion, setLiveRegion] = useState(false);
  const [expandedState, setExpandedState] = useState(false);
  const [count, setCount] = useState(2);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const statusRef = useRef<HTMLParagraphElement>(null);

  // What the live region announces: every change of its text, as it happens.
  useEffect(() => {
    const status = statusRef.current;
    if (!liveRegion || !status) return;
    const observer = new MutationObserver(() => {
      const text = status.textContent?.trim();
      if (text) setLog((current) => withLine(current, `Announced: “${text}”`));
    });
    observer.observe(status, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [liveRegion]);

  function handleLiveRegion(on: boolean) {
    setMessage("");
    setLiveRegion(on);
  }

  function handleAdd() {
    const next = count + 1;
    setCount(next);
    if (liveRegion) setMessage(`Added a sourdough loaf. Your basket has ${next} items.`);
    else setLog((current) => withLine(current, "Nothing announced: the count changed on screen only.", true));
  }

  function handleDisclosure(event: React.MouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget;
    flushSync(() => setOpen((current) => !current));
    const line = `On activation: ${announce(button)}`;
    setLog((current) => withLine(current, line, !expandedState));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle
          checked={liveRegion}
          onCheckedChange={handleLiveRegion}
          title={<>Live region for the basket</>}
          detail={liveRegion ? <>role=&quot;status&quot;, in the page from the start</> : <WrongWay />}
        />
        <Toggle
          checked={expandedState}
          onCheckedChange={setExpandedState}
          title={<>aria-expanded on the disclosure</>}
          detail={expandedState ? "The button says whether its panel is open" : <WrongWay />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Sourdough loaf · €4.50</p>
            <p className="inline-flex items-center gap-1.5 text-sm tabular-nums">
              <ShoppingBasket aria-hidden className="size-4" />
              Basket: {count} items
            </p>
          </div>
          <Button size="sm" className="w-fit" onClick={handleAdd}>
            Add to basket
          </Button>
          {liveRegion ? (
            <p ref={statusRef} role="status" className="sr-only">
              {message}
            </p>
          ) : null}

          <div className="border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={expandedState ? open : undefined}
              aria-controls="dynamic-delivery-panel"
              onClick={handleDisclosure}
            >
              Delivery details
              <ChevronDown aria-hidden className={cn("size-4 motion-safe:transition-transform", open && "rotate-180")} />
            </Button>
            <div id="dynamic-delivery-panel" hidden={!open} className="px-2.5 pt-2 text-sm text-foreground/85">
              Free delivery over €20. Orders before 10:00 arrive the same day.
            </div>
          </div>
        </div>

        <ReaderBox label="Screen reader log (simplified: live region changes and the button on activation)">
          {log.length === 0 ? (
            "Add an item or open the delivery details."
          ) : (
            <ul className="flex flex-col gap-1">
              {log.map((line) => (
                <li key={line.id} className={cn(line.silent && "text-destructive")}>
                  {line.text}
                </li>
              ))}
            </ul>
          )}
        </ReaderBox>
      </div>
    </div>
  );
}
