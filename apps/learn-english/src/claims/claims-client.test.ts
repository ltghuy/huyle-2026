import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCard, putCards } from "@/storage/cards";
import { getClaims, putClaims } from "@/storage/claims";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { makeCard, resetStorage } from "@/storage/test-utils";
import { CLAIM_STATUS_URL, CLAIMS_URL, checkClaims, dismissRejected, FORGET_AFTER_MS, flushClaims, queueClaim, rejectedClaims, type ClaimInput } from "./claims-client";

const TZ = "Asia/Ho_Chi_Minh";
const DEVICE = "0f8fad5b-d9cb-469f-a165-70867728950e";
const DAY1 = Date.UTC(2026, 10, 1, 3); // 10:00 on 1 Nov in Vietnam
const DAY2 = Date.UTC(2026, 10, 2, 3);

const input: ClaimInput = {
  sentenceId: "sentence:sea",
  answer: "Shut your eyes and picture the sea.",
  expected: "Close your eyes and imagine the sea.",
  vi: "Nhắm mắt lại và tưởng tượng biển cả.",
  related: ["word:sea", "grammar:imperative"],
};

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const bodyOf = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body as string);

beforeEach(async () => {
  await resetStorage();
  await saveProfile({ ...createDefaultProfile(DAY1, () => DEVICE), timeZone: TZ, displayName: "Lan" });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("claims client (feature 016)", () => {
  it("keeps one claim per sentence and answer, ignoring what grading forgives", async () => {
    expect(await queueClaim(input, DAY1)).toBe(true);
    expect(await queueClaim({ ...input, answer: "shut your eyes, and picture the sea" }, DAY1)).toBe(false);
    expect(await queueClaim({ ...input, sentenceId: "sentence:other" }, DAY1)).toBe(true);
    const claims = await getClaims();
    expect(claims).toHaveLength(2);
    expect(claims[0]).toMatchObject({ status: "unsent", createdAt: DAY1, related: ["word:sea", "grammar:imperative"] });
  });

  it("sends only the claim id, sentence, answer and the random device id (AC-009), then waits for a decision", async () => {
    await queueClaim(input, DAY1);
    const [claim] = await getClaims();
    fetchMock.mockResolvedValueOnce(json({ accepted: [claim.id] }));
    await flushClaims(DAY1);

    expect(fetchMock.mock.calls[0][0]).toBe(CLAIMS_URL);
    expect(bodyOf(0)).toEqual({ deviceId: DEVICE, claims: [{ id: claim.id, sentenceId: "sentence:sea", answer: input.answer }] });
    expect(JSON.stringify(bodyOf(0))).not.toContain("Lan");
    expect((await getClaims())[0]).toMatchObject({ status: "pending", sentAt: DAY1, checkedAt: DAY1 });
  });

  it("keeps claims when offline or the server fails, and sends them later (AC-008)", async () => {
    await queueClaim(input, DAY1);
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await flushClaims(DAY1);
    fetchMock.mockResolvedValueOnce(json({ error: { message: "x" } }, 503));
    await flushClaims(DAY1);
    fetchMock.mockResolvedValueOnce(json({ error: { message: "x" } }, 429));
    await flushClaims(DAY1);
    expect((await getClaims())[0].status).toBe("unsent");

    const [claim] = await getClaims();
    fetchMock.mockResolvedValueOnce(json({ accepted: [claim.id] }));
    await flushClaims(DAY2);
    expect((await getClaims())[0].status).toBe("pending");
  });

  it("drops quietly a claim the server refuses (AC-010)", async () => {
    await queueClaim(input, DAY1);
    fetchMock.mockResolvedValueOnce(json({ accepted: [] }));
    await flushClaims(DAY1);
    expect((await getClaims())[0].status).toBe("dropped");
    expect(await rejectedClaims()).toEqual([]);
  });

  async function pendingClaim() {
    await queueClaim(input, DAY1);
    const [claim] = await getClaims();
    fetchMock.mockResolvedValueOnce(json({ accepted: [claim.id] }));
    await flushClaims(DAY1);
    fetchMock.mockReset();
    return claim;
  }

  it("asks about pending claims at most once a local day", async () => {
    const claim = await pendingClaim();
    await checkClaims(DAY1 + 60_000); // sent today: nothing to ask yet
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(json({ claims: [{ id: claim.id, status: "pending" }] }));
    await checkClaims(DAY2);
    expect(fetchMock.mock.calls[0][0]).toBe(CLAIM_STATUS_URL);
    expect(bodyOf(0)).toEqual({ ids: [claim.id] });
    await checkClaims(DAY2 + 3_600_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("brings the related cards forward once and shows a rejection until dismissed (AC-015, AC-016)", async () => {
    await putCards([makeCard("word:sea", DAY2 + 10 * 86_400_000), makeCard("grammar:imperative", DAY2 + 5 * 86_400_000)]);
    const claim = await pendingClaim();
    fetchMock.mockResolvedValueOnce(json({ claims: [{ id: claim.id, status: "rejected", explanationVi: "“Picture” ở đây chưa tự nhiên." }] }));
    await checkClaims(DAY2);

    expect((await getCard("word:sea"))?.due).toBe(DAY2);
    expect((await getCard("grammar:imperative"))?.due).toBe(DAY2);
    const rejected = await rejectedClaims();
    expect(rejected).toEqual([expect.objectContaining({ id: claim.id, explanationVi: "“Picture” ở đây chưa tự nhiên.", answer: input.answer, expected: input.expected })]);

    await dismissRejected(rejected, DAY2);
    expect(await rejectedClaims()).toEqual([]);
    expect((await getClaims())[0].status).toBe("shown");
  });

  it("changes nothing for the learner when a claim is approved or dropped (AC-017)", async () => {
    await putCards([makeCard("word:sea", DAY2 + 10 * 86_400_000)]);
    const claim = await pendingClaim();
    fetchMock.mockResolvedValueOnce(json({ claims: [{ id: claim.id, status: "approved" }] }));
    await checkClaims(DAY2);
    expect((await getClaims())[0].status).toBe("approved");
    expect((await getCard("word:sea"))?.due).toBe(DAY2 + 10 * 86_400_000);
    expect(await rejectedClaims()).toEqual([]);
  });

  it("keeps waiting for a claim the server doesn't know, and forgets it after a long time", async () => {
    const claim = await pendingClaim();
    fetchMock.mockImplementation(async () => json({ claims: [] }));
    await checkClaims(DAY2);
    expect((await getClaims())[0].status).toBe("pending");
    await checkClaims(DAY1 + FORGET_AFTER_MS + 86_400_000);
    expect((await getClaims())[0]).toMatchObject({ id: claim.id, status: "dropped" });
  });

  it("never throws when storage holds a claim and the server answers garbage", async () => {
    await putClaims([{ ...input, id: "c1", status: "pending", createdAt: DAY1, checkedAt: DAY1, updatedAt: DAY1 }]);
    fetchMock.mockResolvedValueOnce(new Response("not json", { status: 200 }));
    await expect(checkClaims(DAY2)).resolves.toBeUndefined();
    expect((await getClaims())[0].status).toBe("pending");
  });
});
