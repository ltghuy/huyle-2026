"use client";

import { createDefaultProfile, getProfile, saveProfile } from "@/storage/meta";
import { useStorageQuery } from "./use-storage-query";
import type { Profile } from "@/learning/types";

/** The learner's profile, created with defaults on this browser's first visit. */
export async function ensureProfile(): Promise<Profile> {
  const existing = await getProfile();
  if (existing) return existing;
  const profile = createDefaultProfile(Date.now());
  await saveProfile(profile);
  return profile;
}

const STORES = ["meta"] as const;

export function useProfile() {
  return useStorageQuery(ensureProfile, STORES);
}
