"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { DESTRUCTIVE_TEXT, Modal } from "./modal";
import { modalStore, useConfirmRequests, type ConfirmRequest } from "./modal-store";

/** Renders `confirm()` requests. Mounted once in the playground layout. */
export function ModalHost() {
  const requests = useConfirmRequests();
  const pathname = usePathname();

  // Leaving the page settles every pending confirmation as cancelled.
  useEffect(() => () => modalStore.cancelAll(), [pathname]);

  return requests.map((request) => <ConfirmModal key={request.id} request={request} />);
}

function ConfirmModal({ request }: { request: ConfirmRequest }) {
  const [open, setOpen] = useState(true);

  // Settle as soon as closing starts, so the caller can act (e.g. remove the
  // deleted row) before focus returns.
  function close(result: boolean) {
    request.settle(result);
    setOpen(false);
  }

  return (
    <Modal
      open={open}
      role="alertdialog"
      size="sm"
      title={request.title}
      description={request.description}
      returnFocus={request.returnFocus}
      onRequestClose={() => close(false)}
      onExited={() => modalStore.remove(request.id)}
      footer={
        <>
          <Button variant="outline" data-autofocus onClick={() => close(false)}>
            {request.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            variant={request.destructive ? "destructive" : "default"}
            className={request.destructive ? DESTRUCTIVE_TEXT : undefined}
            onClick={() => close(true)}
          >
            {request.confirmLabel ?? "Confirm"}
          </Button>
        </>
      }
    />
  );
}
