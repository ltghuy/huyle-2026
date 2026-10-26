// App-wide modal service: settings, "ask and wait" confirmations and the
// event log. A module-level store like the toast service, so any code can
// call `confirm()`; <ModalHost /> in the playground layout renders them.

import { useSyncExternalStore } from "react";

import { onModalEvent, type ModalEvent } from "./modal-engine";

export type ModalLayout = "auto" | "dialog" | "sheet";

export type ModalSettings = {
  /** Clicking the backdrop closes dialogs that allow it. */
  backdropCloses: boolean;
  animations: boolean;
  layout: ModalLayout;
};

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm action as destructive. */
  destructive?: boolean;
  /** Where focus goes when the opener is gone after the dialog closes. */
  returnFocus?: () => HTMLElement | null;
};

export type ConfirmRequest = ConfirmOptions & {
  id: number;
  settle: (result: boolean) => void;
};

export type LogEntry = ModalEvent & { id: number; at: number };

const DEFAULT_SETTINGS: ModalSettings = { backdropCloses: true, animations: true, layout: "auto" };
const MAX_LOG = 50;
const NO_REQUESTS: ConfirmRequest[] = [];
const NO_LOG: LogEntry[] = [];

let settings = DEFAULT_SETTINGS;
let requests: ConfirmRequest[] = [];
let log: LogEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function addLog(event: ModalEvent) {
  log = [{ ...event, id: nextId++, at: Date.now() }, ...log].slice(0, MAX_LOG);
  emit();
}

if (typeof window !== "undefined") onModalEvent(addLog);

/** Opens a confirmation; resolves true only for the confirm action. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const id = nextId++;
    let settled = false;
    const settle = (result: boolean) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    requests = [...requests, { ...options, id, settle }];
    emit();
  });
}

export const modalStore = {
  setSettings(patch: Partial<ModalSettings>) {
    settings = { ...settings, ...patch };
    emit();
  },
  /** Drops a confirmation once its dialog has finished closing. */
  remove(id: number) {
    requests = requests.filter((r) => r.id !== id);
    emit();
  },
  /** Settles every pending confirmation as cancelled and removes it. */
  cancelAll() {
    if (requests.length === 0) return;
    for (const request of requests) request.settle(false);
    requests = [];
    emit();
  },
  log: addLog,
  clearLog() {
    log = [];
    emit();
  },
};

export function useModalSettings() {
  return useSyncExternalStore(subscribe, () => settings, () => DEFAULT_SETTINGS);
}

export function useConfirmRequests() {
  return useSyncExternalStore(subscribe, () => requests, () => NO_REQUESTS);
}

export function useModalLog() {
  return useSyncExternalStore(subscribe, () => log, () => NO_LOG);
}
