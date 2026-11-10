import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_USERS, signInAs } from "../helpers";

// Feature 039: a team match ("Đấu đội") between three signed-in learners on the Cloudflare preview
// (real Worker, Durable Object and D1), with their own accounts so the duel specs can run in
// parallel. A round lasts at least 5 minutes, too long for e2e, so the match ends the way a short
// one can: team B's only player leaves, and after 30 s team A wins by forfeit.

type User = (typeof E2E_USERS)[keyof typeof E2E_USERS];

async function signedIn(browser: Browser, user: User, baseURL: string): Promise<Page> {
  const context = await browser.newContext({ baseURL, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  await signInAs(context, user, baseURL);
  return context.newPage();
}

type HistoryMatch = { id: string; won: boolean; forfeit: boolean; team?: { mine: "A" | "B"; draw: boolean; members: { A: { name: string }[]; B: { name: string }[] } } };

async function newest(page: Page): Promise<HistoryMatch | undefined> {
  return ((await (await page.request.get("/api/arena/matches")).json()) as { matches: HistoryMatch[] }).matches[0];
}

/** Creates a 1-round "Nhớ từ" team room at A2 from the hub's "Đấu đội" card and returns its code. */
async function createTeamRoom(page: Page): Promise<string> {
  await page.goto("/arena");
  await page.getByRole("link", { name: "Đấu đội" }).click();
  await page.waitForURL("**/arena/team");
  await page.getByRole("button", { name: "A2" }).click();
  await page.getByRole("radio", { name: /^Nhớ từ/ }).check({ force: true });
  await page.getByRole("radio", { name: /1 hiệp/ }).check();
  const create = page.getByRole("button", { name: "Tạo phòng" });
  await expect(create).toBeEnabled({ timeout: 15_000 });
  await create.click();
  await page.waitForURL(/\/arena\/room\?code=[A-Z2-9]{6}$/);
  return new URL(page.url()).searchParams.get("code")!;
}

test.describe("Arena team matches", () => {
  test("three learners make teams, take turns, use a hint, and the match ends in everyone's history (AC-001–AC-047)", async ({ browser, baseURL }) => {
    test.setTimeout(180_000);
    const tam = await signedIn(browser, E2E_USERS.tam, baseURL!);
    const uyen = await signedIn(browser, E2E_USERS.uyen, baseURL!);
    const vy = await signedIn(browser, E2E_USERS.vy, baseURL!);

    const code = await createTeamRoom(tam);
    await uyen.goto(`/arena/room?code=${code}`);
    await vy.goto(`/arena/room?code=${code}`);
    await expect(tam.getByText("3/6 người")).toBeVisible({ timeout: 15_000 });

    // The host can't start until everyone is on a team (AC-008, AC-014).
    const start = tam.getByRole("button", { name: "Bắt đầu" });
    await expect(start).toBeDisabled();
    await expect(tam.getByText("Còn 3 người chưa xếp đội.")).toBeVisible();
    await expect(uyen.getByText("Chờ chủ phòng bắt đầu…")).toBeVisible();

    // Uneven teams: Tâm and Uyên against Vy (AC-009, AC-012).
    await tam.getByRole("button", { name: "Đưa Tâm vào Đội A" }).click();
    await tam.getByRole("button", { name: "Đưa Uyên vào Đội A" }).click();
    await tam.getByRole("button", { name: "Đưa Vy vào Đội B" }).click();
    await expect(start).toBeEnabled();
    await start.click();

    // Team A opens with its first member; the others watch (AC-018–AC-021).
    await expect(tam.getByText("Lượt của bạn")).toBeVisible({ timeout: 15_000 });
    await expect(vy.getByText("Lượt của Tâm · Đội A")).toBeVisible();

    // A hint shows the first letter to everyone (AC-032, AC-033), within 1 s (Success Criteria).
    const hintAt = Date.now();
    await tam.getByRole("button", { name: "Gợi ý (còn 1)" }).click();
    await expect(uyen.getByText("Gợi ý:")).toBeVisible();
    await expect(vy.getByText("Gợi ý:")).toBeVisible();
    const hintMs = Date.now() - hintAt;
    await expect(tam.getByRole("button", { name: /Gợi ý/ })).toBeDisabled();

    // Nobody answers: the reveal shows on every screen, then it's team B's turn (AC-024, AC-025).
    await expect(vy.getByRole("region", { name: "Đáp án" })).toBeVisible({ timeout: 25_000 });
    await expect(tam.getByRole("region", { name: "Đáp án" })).toBeVisible();
    // The turn change lands on every screen at about the same moment: the latest is under 1 s after the first.
    const seenAt = await Promise.all([
      vy.getByText("Lượt của bạn").waitFor({ timeout: 10_000 }).then(() => Date.now()),
      tam.getByText("Lượt của Vy · Đội B").waitFor({ timeout: 10_000 }).then(() => Date.now()),
      uyen.getByText("Lượt của Vy · Đội B").waitFor({ timeout: 10_000 }).then(() => Date.now()),
    ]);
    const turnSpreadMs = Math.max(...seenAt) - Math.min(...seenAt);
    console.log(`team e2e: hint on every screen in ${hintMs} ms, turn change spread ${turnSpreadMs} ms`);
    expect(hintMs).toBeLessThan(1_000);
    expect(turnSpreadMs).toBeLessThan(1_000);

    // Team B's only player leaves: the match waits 30 s, then team A wins (AC-042, AC-045).
    await vy.getByRole("button", { name: "Rời trận" }).click();
    await vy.getByRole("alertdialog").getByRole("button", { name: "Rời trận" }).click();
    await vy.waitForURL("**/arena");
    await expect(tam.getByText("Đang chờ Đội B kết nối lại…")).toBeVisible({ timeout: 10_000 });
    await expect(tam.getByText("Đội A thắng!")).toBeVisible({ timeout: 45_000 });
    await expect(tam.getByText("Đội B rời trận")).toBeVisible();
    await expect(uyen.getByText("Đội A thắng!")).toBeVisible();

    // Every player has the match in their history; the Arena record is untouched (AC-040).
    await expect.poll(async () => (await newest(vy))?.team?.mine, { timeout: 10_000 }).toBe("B");
    const tamSide = await newest(tam);
    expect(tamSide).toMatchObject({ won: true, forfeit: true, team: { mine: "A", draw: false } });
    expect(tamSide!.team!.members.A.map((m) => m.name)).toEqual(["Tâm", "Uyên"]);
    expect(tamSide!.team!.members.B.map((m) => m.name)).toEqual(["Vy"]);
    expect(await newest(uyen)).toMatchObject({ id: tamSide!.id, won: true });
    expect(await newest(vy)).toMatchObject({ id: tamSide!.id, won: false });
    const stats = (await (await tam.request.get("/api/arena/stats")).json()) as { wins: number; losses: number };
    expect(stats).toMatchObject({ wins: 0, losses: 0 });
  });
});
