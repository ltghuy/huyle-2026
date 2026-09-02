import type { Locale } from "../config";
import { en, type Dictionary } from "./en";
import { vi } from "./vi";

export type { Dictionary, Chapter } from "./en";

/** Active-locale UI/prose dictionaries, keyed by Locale. */
export const dictionaries: Record<Locale, Dictionary> = { en, vi };
