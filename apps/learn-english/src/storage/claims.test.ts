import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StoredClaim } from "@/learning/types";
import { subscribeLocalChanges } from "./broadcast";
import { getClaim, getClaims, getClaimsByStatus, putClaims } from "./claims";
import { resetStorage } from "./test-utils";

const claim = (id: string, status: StoredClaim["status"], updatedAt = 1): StoredClaim => ({
  id,
  sentenceId: "sentence:hello",
  answer: "Hi there",
  expected: "Hello there",
  vi: "Xin chào",
  related: ["word:hello"],
  createdAt: 1,
  status,
  updatedAt,
});

describe("claims storage (016)", () => {
  let changes: string[][] = [];
  let unsubscribe = () => {};

  beforeEach(async () => {
    await resetStorage();
    changes = [];
    unsubscribe = subscribeLocalChanges((stores) => changes.push([...stores]));
  });
  afterEach(() => unsubscribe());

  it("saves many, reads all, by id and by status", async () => {
    await putClaims([claim("a", "unsent"), claim("b", "pending"), claim("c", "rejected")]);
    expect((await getClaims()).map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect((await getClaim("b"))?.status).toBe("pending");
    expect(await getClaim("missing")).toBeUndefined();
    expect((await getClaimsByStatus("unsent", "pending")).map((c) => c.id)).toEqual(["a", "b"]);
    expect(await getClaimsByStatus("shown")).toEqual([]);
  });

  it("replaces a claim with the same id and tells other tabs", async () => {
    await putClaims([claim("a", "unsent")]);
    await putClaims([claim("a", "pending", 2)]);
    expect(await getClaims()).toEqual([claim("a", "pending", 2)]);
    expect(changes).toEqual([["claims"], ["claims"]]);
  });

  it("writes nothing for an empty list", async () => {
    await putClaims([]);
    expect(changes).toEqual([]);
  });
});
