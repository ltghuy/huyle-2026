import { DEFAULT_TIME_ZONE, type Profile } from "@/learning/types";
import { notifyChanged } from "./broadcast";
import { getDb } from "./db";

const PROFILE_KEY = "profile";

function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export function createDefaultProfile(now: number, randomId: () => string = () => crypto.randomUUID()): Profile {
  return {
    level: "A1",
    placement: "pending",
    tourSeen: false,
    createdAt: now,
    timeZone: detectTimeZone(),
    statsOptOut: false,
    deviceId: randomId(),
    schemaVersion: 1,
    fieldUpdatedAt: {},
  };
}

export async function getProfile(): Promise<Profile | undefined> {
  const record = await (await getDb()).get("meta", PROFILE_KEY);
  return record?.value as Profile | undefined;
}

export async function saveProfile(profile: Profile): Promise<void> {
  await (await getDb()).put("meta", { key: PROFILE_KEY, value: profile });
  notifyChanged(["meta"]);
}

/**
 * Applies `patch` to the stored profile and stamps each changed field in
 * `fieldUpdatedAt`, which the sync merge uses for last-writer-wins.
 */
export async function updateProfile(
  patch: Partial<Omit<Profile, "deviceId" | "fieldUpdatedAt">>,
  now: number,
): Promise<Profile> {
  const db = await getDb();
  let next: Profile | undefined;
  await db.transaction(["meta"], async (tx) => {
    const current = ((await tx.get("meta", PROFILE_KEY))?.value as Profile | undefined) ?? createDefaultProfile(now);
    const stamps = { ...current.fieldUpdatedAt };
    for (const key of Object.keys(patch) as (keyof typeof patch)[]) stamps[key] = now;
    next = { ...current, ...patch, fieldUpdatedAt: stamps };
    await tx.put("meta", { key: PROFILE_KEY, value: next });
  });
  notifyChanged(["meta"]);
  return next!;
}
