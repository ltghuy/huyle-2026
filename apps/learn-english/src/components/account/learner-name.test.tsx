import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { MascotShowcase } from "@/components/home/mascot-showcase";
import { NameSetting } from "@/components/settings/name-setting";
import { learnerName } from "@/lib/learner-name";
import { createDefaultProfile, getProfile, saveProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";

// Feature 022: the app calls a signed-in learner by their Google name; a chosen name is optional.

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
const USER = { id: "u1", name: "Huy Le", email: "huy@example.com", image: null };

function stubSession(signedIn: boolean) {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(signedIn ? { user: USER, session: {} } : null)));
}

beforeEach(async () => {
  await resetStorage();
  await saveProfile(createDefaultProfile(0, () => "device-a"));
});

afterEach(() => vi.unstubAllGlobals());

describe("learnerName", () => {
  it("prefers the chosen name, then the Google name", () => {
    expect(learnerName("Evan", "Huy Le")).toBe("Evan");
    expect(learnerName("  ", "Huy Le")).toBe("Huy Le");
    expect(learnerName(undefined, undefined)).toBeUndefined();
  });
});

describe("signed in without a chosen name", () => {
  it("greets by the Google name in the home cat's bubble (quick 073)", async () => {
    stubSession(true);
    render(<MascotShowcase />);
    expect(await screen.findByText("Xin chào Huy Le!")).toBeInTheDocument();
    expect(screen.getByText(/Cùng cải thiện tiếng Anh nhé!/)).toBeInTheDocument();
  });

  it("lets the chosen name be cleared in Settings, going back to the Google name", async () => {
    stubSession(true);
    await saveProfile({ ...createDefaultProfile(0, () => "device-a"), displayName: "Evan" });
    render(<NameSetting />);
    const field = await screen.findByLabelText("Tên gọi (không bắt buộc)");
    expect(screen.getByText(/tên Google \(Huy Le\)/)).toBeInTheDocument();
    fireEvent.change(field, { target: { value: "" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Lưu tên" })));
    await waitFor(async () => expect((await getProfile())?.displayName).toBeUndefined());
  });
});

describe("guests", () => {
  it("may leave the name empty in Settings (quick 051)", async () => {
    stubSession(false);
    await saveProfile({ ...createDefaultProfile(0, () => "device-a"), displayName: "Minh" });
    render(<NameSetting />);
    const field = await screen.findByLabelText("Tên gọi (không bắt buộc)");
    fireEvent.change(field, { target: { value: "  " } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Lưu tên" })));
    await waitFor(async () => expect((await getProfile())?.displayName).toBeUndefined());
  });
});
