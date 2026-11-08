"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { sendLeave } from "@/lib/social-client";
import { SOCIAL_KEY, useSocial } from "./use-social";

// Keeps the learner's presence up to date on every page, focus screens included (feature 031):
// it holds the pulse query, and when the last open tab goes away it says goodbye so friends see
// the learner offline at once (AC-015). Tabs learn about each other over a BroadcastChannel,
// because `pagehide` can't wait for anything asynchronous.

const CHANNEL = "tuxedo-presence";

type Message = { type: "hello" | "here" | "bye"; id: string };

/** Pure, for tests: tracks the other open tabs and says whether this one is the last. */
export function createTabTracker(post: (message: Message) => void, id: string = crypto.randomUUID()) {
  const others = new Set<string>();
  return {
    announce: () => post({ type: "hello", id }),
    receive(message: Message) {
      if (message.id === id) return;
      if (message.type === "bye") others.delete(message.id);
      else others.add(message.id);
      if (message.type === "hello") post({ type: "here", id });
    },
    /** Says goodbye to the other tabs; true when none is left open. */
    leave(): boolean {
      post({ type: "bye", id });
      return others.size === 0;
    },
  };
}

export function PresenceRunner() {
  const { signedIn } = useSocial();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!signedIn || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL);
    const tracker = createTabTracker((message) => channel.postMessage(message));
    channel.onmessage = (event: MessageEvent<Message>) => tracker.receive(event.data);
    tracker.announce();

    function handlePageHide() {
      if (tracker.leave()) sendLeave();
    }
    function handlePageShow(event: PageTransitionEvent) {
      // Back from the back-forward cache: the page didn't reload, so check in again.
      if (!event.persisted) return;
      tracker.announce();
      void queryClient.invalidateQueries({ queryKey: SOCIAL_KEY });
    }
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      channel.close();
    };
  }, [signedIn, queryClient]);

  return null;
}
