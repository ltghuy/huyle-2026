"use client";

import { Redo2, Undo2 } from "lucide-react";
import { useEffect, useEffectEvent } from "react";

import { Button } from "@/components/ui/button";

import { RENDER_ROOT, RenderBadge, useRenderCount } from "./render-counter";
import { useShopDispatch, useShopSelector } from "./shop-context";
import { actions, canRedo, canUndo } from "./shop-reducer";

/** Text fields keep their own undo. */
function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export function UndoBar() {
  const badge = useRenderCount("Undo bar");
  const undoable = useShopSelector(canUndo);
  const redoable = useShopSelector(canRedo);
  const dispatch = useShopDispatch();

  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || isEditable(event.target)) return;
    const key = event.key.toLowerCase();
    const redo = (key === "z" && event.shiftKey) || (key === "y" && event.ctrlKey && !event.shiftKey);
    const undo = key === "z" && !event.shiftKey;
    if (!undo && !redo) return;
    event.preventDefault();
    if (undo && undoable) dispatch(actions.undo());
    if (redo && redoable) dispatch(actions.redo());
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleShortcut(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  return (
    <div data-render-root className={`flex items-center gap-2 p-1 ${RENDER_ROOT}`}>
      <Button variant="outline" size="sm" disabled={!undoable} onClick={() => dispatch(actions.undo())} aria-keyshortcuts="Control+Z Meta+Z">
        <Undo2 aria-hidden /> Undo
      </Button>
      <Button variant="outline" size="sm" disabled={!redoable} onClick={() => dispatch(actions.redo())} aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y">
        <Redo2 aria-hidden /> Redo
      </Button>
      <RenderBadge badgeRef={badge} label="Undo bar" />
    </div>
  );
}
