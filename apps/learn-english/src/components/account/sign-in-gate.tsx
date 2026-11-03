"use client";

import type { ReactNode } from "react";
import { canUseLockedAreas, useAccount } from "@/hooks/use-account";
import { SignInPrompt, type LockedArea } from "./sign-in-prompt";

interface SignInGateProps {
  area: LockedArea;
  children: ReactNode;
  /** Shown while it isn't known yet whether the learner is signed in (the leaf's own skeleton). */
  fallback?: ReactNode;
  /** `data-tour` for the prompt, so the first-visit tour still finds the step's target (AC-030). */
  tour?: string;
  /** For the prompt's wrapper, e.g. room above it on focus screens that have no navigation. */
  className?: string;
  /** The owl in the prompt, for screens without a hero owl (focus screens). */
  owl?: boolean;
}

/** A locked area (feature 022): its content for signed-in learners, a sign-in prompt for guests. */
export function SignInGate({ area, children, fallback = null, tour, className, owl }: SignInGateProps) {
  const { status } = useAccount();
  if (status === "unknown") return fallback;
  if (!canUseLockedAreas(status)) return <SignInPrompt area={area} tour={tour} className={className} owl={owl} />;
  return children;
}
