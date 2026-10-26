"use client";

import { Trash2 } from "lucide-react";
import { useRef, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

import { DESTRUCTIVE_TEXT } from "./modal";
import { describe } from "./modal-engine";
import { modalStore } from "./modal-store";

const TITLE = "Delete “Website redesign”? (native)";

function noSubscribe() {
  return () => {};
}

/** Newer browsers can light-dismiss a modal dialog with `closedby="any"`. */
function useClosedBySupport() {
  return useSyncExternalStore(noSubscribe, () => "closedBy" in HTMLDialogElement.prototype, () => null);
}

function logClose(result: string) {
  modalStore.log({ type: "close", title: TITLE, detail: `${result} · focus → ${describe(document.activeElement)}` });
}

/** The same confirmation on `<dialog>.showModal()`, for comparison. */
export function NativeConfirm() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reason = useRef("dialog button");
  const closedBy = useClosedBySupport();

  function handleOpen() {
    const dialog = dialogRef.current!;
    reason.current = "dialog button";
    dialog.returnValue = "";
    dialog.showModal();
    modalStore.log({ type: "open", title: TITLE, detail: `focus → ${describe(document.activeElement)}` });
  }

  // Escape (or a light dismiss) fires `cancel` before `close`.
  function handleCancel() {
    reason.current = "Escape";
  }

  function handleClose() {
    const result = dialogRef.current?.returnValue === "delete" ? "deleted (nothing removed: demo)" : reason.current;
    // Focus is restored by the browser after `close`; log where it went.
    requestAnimationFrame(() => logClose(result));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-foreground/75">
        The browser makes the page inert (toasts too), handles Escape and returns focus. Page scroll isn&apos;t
        locked, and the backdrop doesn&apos;t close it.
      </p>
      {closedBy === null ? null : (
        <p className="text-xs text-foreground/75">
          Light dismiss with <code>closedby=&quot;any&quot;</code>: {closedBy ? "supported" : "not supported"} in this browser (not used for a confirmation).
        </p>
      )}
      <div>
        <Button variant="outline" size="sm" onClick={handleOpen}>
          <Trash2 aria-hidden /> Native confirm
        </Button>
      </div>
      <dialog
        ref={dialogRef}
        role="alertdialog"
        aria-labelledby="native-confirm-title"
        aria-describedby="native-confirm-description"
        onCancel={handleCancel}
        onClose={handleClose}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border bg-popover p-0 text-sm text-popover-foreground shadow-lg backdrop:bg-black/50"
      >
        <form method="dialog" className="flex flex-col">
          <div className="flex flex-col gap-1.5 px-5 pt-5 pb-4">
            <h2 id="native-confirm-title" className="text-lg font-semibold">
              {TITLE}
            </h2>
            <p id="native-confirm-description" className="text-foreground/75">
              Built on the native dialog element. Nothing is actually deleted.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t px-5 py-4">
            <Button type="submit" variant="outline" value="cancel" autoFocus>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" value="delete" className={DESTRUCTIVE_TEXT}>
              Delete project
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
