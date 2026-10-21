"use client";

import { Plus, X } from "lucide-react";
import {
  createElement,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Choice } from "@/handbook/jwt/token-view";
import { Verdict } from "@/handbook/ui";
import { cn } from "@/lib/utils";

import {
  describe,
  KIND_LABEL,
  type Locator,
  type LocatorKind,
  match,
  ROLES,
} from "./locators";
import {
  FORM_CHANGES,
  type FormNode,
  formTree,
  TARGET_LABEL,
  toHtml,
} from "./sample-form";

const STARTERS: Locator[] = [
  { id: "s1", kind: "role", role: "button", value: "Create account" },
  { id: "s2", kind: "css", value: ".btn-primary" },
  { id: "s3", kind: "text", value: "Create account" },
  { id: "s4", kind: "testid", value: "signup-submit" },
  { id: "s5", kind: "label", value: "Email" },
  { id: "s6", kind: "css", value: "form > input[type=email]" },
];

const KIND_ITEMS = (Object.keys(KIND_LABEL) as LocatorKind[]).map((kind) => ({
  value: kind,
  label: KIND_LABEL[kind],
}));
const ROLE_ITEMS = ROLES.map((role) => ({ value: role, label: role }));
const CHANGE_OPTIONS = FORM_CHANGES.map((c) => ({
  value: c.id,
  label: c.label,
}));

function subscribe() {
  return () => {};
}

/** Keys of the elements a locator matches in one version of the form. */
function keysFor(
  html: string,
  locator: Locator,
): { keys: string[]; error?: string } {
  const doc = new DOMParser().parseFromString(
    `<div id="root">${html}</div>`,
    "text/html",
  );
  const result = match(doc.getElementById("root")!, locator);
  return {
    keys: result.elements.map((el) => el.getAttribute("data-key") ?? "unkeyed"),
    error: result.error,
  };
}

function render(
  node: FormNode | string,
  hits: Set<string>,
  i: number,
): React.ReactNode {
  if (typeof node === "string") return node;
  const { class: className, for: htmlFor, ...rest } = node.attrs ?? {};
  const hit = node.key ? hits.has(node.key) : false;
  return createElement(
    node.tag,
    {
      key: i,
      ...rest,
      className: cn(
        className,
        hit && "outline-3 outline-offset-2 outline-primary",
      ),
      htmlFor,
      ...(node.tag === "input" ? { readOnly: true } : {}),
    },
    ...(node.children ?? []).map((child, j) => render(child, hits, j)),
  );
}

function describeTarget(keys: string[]) {
  if (keys.length === 0) return "nothing";
  if (keys.length > 1) return `${keys.length} elements`;
  return TARGET_LABEL[keys[0]] ?? "an element";
}

export function LocatorDemo() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [changeId, setChangeId] = useState("original");
  const [locators, setLocators] = useState<Locator[]>(STARTERS);
  const [selected, setSelected] = useState("s1");
  const [draft, setDraft] = useState<Locator>({
    id: "",
    kind: "role",
    role: "button",
    value: "",
  });
  const ids = { kind: useId(), role: useId(), value: useId() };

  const original = useMemo(() => toHtml(formTree("original")), []);
  const tree = useMemo(() => formTree(changeId), [changeId]);
  const html = useMemo(() => toHtml(tree), [tree]);

  const rows = mounted
    ? locators.map((locator) => {
        const before = keysFor(original, locator);
        const now = keysFor(html, locator);
        const same =
          before.keys.length === 1 &&
          now.keys.length === 1 &&
          before.keys[0] === now.keys[0];
        return { locator, before, now, same };
      })
    : [];
  const selectedRow = rows.find((r) => r.locator.id === selected);
  const hits = new Set(selectedRow?.now.keys ?? []);

  const ranking = mounted ? rankKinds(locators) : [];

  function handleAdd() {
    if (!draft.value.trim() && draft.kind !== "role") return;
    const id = `l${Date.now()}`;
    setLocators((current) => [
      ...current,
      { ...draft, id, value: draft.value.trim() },
    ]);
    setSelected(id);
    setDraft((current) => ({ ...current, value: "" }));
  }

  function handleRemove(id: string) {
    setLocators((current) => current.filter((l) => l.id !== id));
  }

  function handleKind(kind: LocatorKind | null) {
    if (kind) setDraft((current) => ({ ...current, kind }));
  }

  function handleRole(role: string | null) {
    if (role) setDraft((current) => ({ ...current, role }));
  }

  function handleValue(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setDraft((current) => ({ ...current, value }));
  }

  function handleDraftSubmit(event: React.FormEvent) {
    event.preventDefault();
    handleAdd();
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Choice
        legend="Change the form"
        value={changeId}
        options={CHANGE_OPTIONS}
        onChange={setChangeId}
      />
      <p className="text-sm text-foreground/85">
        {FORM_CHANGES.find((c) => c.id === changeId)!.note}
      </p>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <h4 className="text-sm font-medium">The page under test</h4>
          <div
            inert
            className="rounded-lg border bg-card p-4 text-sm [&_.actions]:mt-3 [&_.actions]:flex [&_.actions]:gap-2 [&_.check]:mt-3 [&_.check]:flex [&_.check]:items-center [&_.check]:gap-2 [&_a]:mt-3 [&_a]:inline-block [&_a]:underline [&_button]:rounded-md [&_button]:border [&_button]:px-3 [&_button]:py-1.5 [&_h3]:mb-3 [&_h3]:font-semibold [&_input:not([type=checkbox])]:mt-1 [&_input:not([type=checkbox])]:mb-2 [&_input:not([type=checkbox])]:block [&_input:not([type=checkbox])]:w-full [&_input:not([type=checkbox])]:rounded-md [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:px-2 [&_input:not([type=checkbox])]:py-1 [&_label]:text-xs [&_label]:text-foreground/75"
          >
            {render(tree, hits, 0)}
          </div>
          <pre
            className="relative max-h-40 overflow-auto rounded-md bg-muted/40 p-2 font-mono text-[0.6875rem] break-all whitespace-pre-wrap"
            tabIndex={0}
            aria-label="The form's HTML"
          >
            {html.replace(/ data-key="[^"]*"/g, "")}
          </pre>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <h4 className="text-sm font-medium">Your locators</h4>
          <ul className="flex min-w-0 flex-col gap-2" aria-live="polite">
            {rows.map(({ locator, before, now, same }) => (
              <li
                key={locator.id}
                className={cn(
                  "flex min-w-0 items-start gap-2 rounded-lg border p-2",
                  selected === locator.id && "border-primary/50 bg-primary/5",
                )}
              >
                <button
                  type="button"
                  aria-pressed={selected === locator.id}
                  onClick={() => setSelected(locator.id)}
                  className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <code className="font-mono text-xs break-all">
                    page.{describe(locator)}
                  </code>
                  <span className="text-xs text-foreground/75">
                    {now.error ?? `Finds ${describeTarget(now.keys)}`}
                    {now.keys.length > 1
                      ? ": a strict locator fails with more than one match"
                      : ""}
                  </span>
                  {changeId !== "original" && !now.error ? (
                    before.keys.length === 1 ? (
                      <Verdict pass={same}>
                        {same
                          ? "Still finds the same element"
                          : `Broke: found ${describeTarget(before.keys)} before`}
                      </Verdict>
                    ) : (
                      <span className="text-xs text-foreground/75">
                        Already ambiguous before the change, so it was never usable
                      </span>
                    )
                  ) : null}
                </button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${describe(locator)}`}
                  onClick={() => handleRemove(locator.id)}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
            {!mounted ? (
              <li className="text-sm text-foreground/75">
                Loading the locators…
              </li>
            ) : null}
          </ul>

          <form
            onSubmit={handleDraftSubmit}
            className="grid min-w-0 gap-2 rounded-lg border border-dashed p-3 sm:grid-cols-2"
          >
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor={ids.kind}>Kind</Label>
              <Select
                items={KIND_ITEMS}
                value={draft.kind}
                onValueChange={handleKind}
              >
                <SelectTrigger id={ids.kind} className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_ITEMS.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                      className="text-xs"
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {draft.kind === "role" ? (
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor={ids.role}>Role</Label>
                <Select
                  items={ROLE_ITEMS}
                  value={draft.role}
                  onValueChange={handleRole}
                >
                  <SelectTrigger
                    id={ids.role}
                    className="w-full font-mono text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_ITEMS.map((item) => (
                      <SelectItem
                        key={item.value}
                        value={item.value}
                        className="font-mono text-xs"
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={ids.value}>
                {draft.kind === "role"
                  ? "Accessible name (optional)"
                  : draft.kind === "css"
                    ? "Selector"
                    : "Value"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id={ids.value}
                  value={draft.value}
                  onChange={handleValue}
                  className="font-mono text-xs"
                  spellCheck={false}
                />
                <Button type="submit" variant="outline">
                  <Plus aria-hidden /> Add
                </Button>
              </div>
            </div>
          </form>

          {ranking.length > 0 ? (
            <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                How each kind held up across the four changes
              </p>
              <ol className="flex list-decimal flex-col gap-0.5 pl-5">
                {ranking.map((r) => (
                  <li key={r.kind}>
                    {KIND_LABEL[r.kind]}: kept {r.kept} of {r.total} change
                    checks
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Per kind, how many (locator, change) pairs still found the same single element. */
function rankKinds(locators: Locator[]) {
  const original = toHtml(formTree("original"));
  const tally = new Map<LocatorKind, { kept: number; total: number }>();
  for (const locator of locators) {
    const before = keysFor(original, locator);
    if (before.keys.length !== 1) continue;
    for (const change of FORM_CHANGES.slice(1)) {
      const now = keysFor(toHtml(formTree(change.id)), locator);
      const entry = tally.get(locator.kind) ?? { kept: 0, total: 0 };
      entry.total += 1;
      if (now.keys.length === 1 && now.keys[0] === before.keys[0])
        entry.kept += 1;
      tally.set(locator.kind, entry);
    }
  }
  return [...tally.entries()]
    .map(([kind, t]) => ({ kind, ...t }))
    .sort((a, b) => b.kept / b.total - a.kept / a.total);
}
