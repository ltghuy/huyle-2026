import type { SelectionInput } from "@/server/practices/data-grid/grid.schema";

// Selection is by employee id, never by row index, so it survives sorting,
// filtering and paging. "Select all matching" is stored as a rule (every row
// matching a filter, except these ids) instead of a list of ids, so it can
// cover rows the browser never downloaded.

export type Selection =
  | { kind: "ids"; ids: ReadonlySet<string> }
  | {
      kind: "all";
      /** The search + filters the rule was made under (see `filterKey`). */
      filterKey: string;
      except: ReadonlySet<string>;
      /** How many rows matched when the rule was made. */
      total: number;
    };

export const EMPTY_SELECTION: Selection = { kind: "ids", ids: new Set() };

export function isSelected(selection: Selection, id: string) {
  return selection.kind === "ids"
    ? selection.ids.has(id)
    : !selection.except.has(id);
}

export function selectedCount(selection: Selection) {
  return selection.kind === "ids"
    ? selection.ids.size
    : selection.total - selection.except.size;
}

/** Selects or deselects `ids`, keeping the selection's shape. */
export function setSelected(
  selection: Selection,
  ids: readonly string[],
  selected: boolean,
): Selection {
  if (selection.kind === "ids") {
    const next = new Set(selection.ids);
    for (const id of ids) {
      if (selected) next.add(id);
      else next.delete(id);
    }
    return { kind: "ids", ids: next };
  }
  const except = new Set(selection.except);
  for (const id of ids) {
    if (selected) except.delete(id);
    else except.add(id);
  }
  // Every row was deselected one by one: back to an empty id set.
  if (except.size >= selection.total) return EMPTY_SELECTION;
  return { ...selection, except };
}

export function toggle(selection: Selection, id: string): Selection {
  return setSelected(selection, [id], !isSelected(selection, id));
}

/**
 * Shift+click: every row between the anchor and the clicked row (inclusive,
 * in the order shown) takes the state `selected`. Without an anchor on this
 * page it's a normal click.
 */
export function setRange(
  selection: Selection,
  pageIds: readonly string[],
  anchorId: string | null,
  clickedId: string,
  selected: boolean,
): Selection {
  const to = pageIds.indexOf(clickedId);
  const from = anchorId === null ? -1 : pageIds.indexOf(anchorId);
  if (from === -1 || to === -1)
    return setSelected(selection, [clickedId], selected);
  const [start, end] = from < to ? [from, to] : [to, from];
  return setSelected(selection, pageIds.slice(start, end + 1), selected);
}

export type PageState = "none" | "some" | "all";

/** The header checkbox: how many rows of the current page are selected. */
export function pageState(
  selection: Selection,
  pageIds: readonly string[],
): PageState {
  let count = 0;
  for (const id of pageIds) if (isSelected(selection, id)) count++;
  return count === 0 ? "none" : count === pageIds.length ? "all" : "some";
}

export function selectAllMatching(filterKey: string, total: number): Selection {
  return { kind: "all", filterKey, except: new Set(), total };
}

/** An "all matching" rule turned into the explicit ids it covers. */
export function toExplicit(
  selection: Selection,
  matchingIds: readonly string[],
): Selection {
  if (selection.kind === "ids") return selection;
  return {
    kind: "ids",
    ids: new Set(matchingIds.filter((id) => !selection.except.has(id))),
  };
}

/** What the server needs to know about the selection. */
export function toRequest(selection: Selection): SelectionInput {
  return selection.kind === "ids"
    ? { kind: "ids", ids: [...selection.ids] }
    : { kind: "all", except: [...selection.except] };
}

/** Drops ids beyond the dataset (`E00001` … `E{size}`). */
export function pruneToSize(selection: Selection, size: number): Selection {
  if (selection.kind === "all") return selection;
  const ids = [...selection.ids].filter((id) => Number(id.slice(1)) <= size);
  return ids.length === selection.ids.size
    ? selection
    : { kind: "ids", ids: new Set(ids) };
}
