import type { ClaimStatus, StoredClaim } from "@/learning/types";
import { notifyChanged } from "./broadcast";
import { getDb } from "./db";

export async function getClaim(id: string): Promise<StoredClaim | undefined> {
  return (await getDb()).get("claims", id);
}

export async function getClaims(): Promise<StoredClaim[]> {
  return (await getDb()).getAll("claims");
}

/** Claims in any of `statuses`, in status then id order. */
export async function getClaimsByStatus(...statuses: ClaimStatus[]): Promise<StoredClaim[]> {
  const db = await getDb();
  const groups = await Promise.all(statuses.map((status) => db.getAllFromIndex("claims", "status", { lower: status, upper: status })));
  return groups.flat();
}

/** Saves every claim in one transaction. */
export async function putClaims(claims: readonly StoredClaim[]): Promise<void> {
  if (claims.length === 0) return;
  await (await getDb()).transaction(["claims"], async (tx) => {
    for (const claim of claims) await tx.put("claims", claim);
  });
  notifyChanged(["claims"]);
}
