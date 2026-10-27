import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NameSetting } from "@/components/settings/name-setting";
import { createDefaultProfile, getProfile, saveProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";
import { NamePrompt } from "./name-prompt";

beforeEach(async () => {
  await resetStorage();
});

describe("NamePrompt", () => {
  it("asks for a name, refuses one without letters, and saves a cleaned name (AC-001, AC-003, AC-004)", async () => {
    render(<NamePrompt />);
    const dialog = await screen.findByRole("dialog", { name: "Bạn tên là gì?" });
    const input = screen.getByLabelText("Tên của bạn");

    fireEvent.change(input, { target: { value: " 42 " } });
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu" }));
    expect(await screen.findByText(/Bạn nhập tên của mình nhé/)).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect((await getProfile())?.displayName).toBeUndefined();

    fireEvent.change(input, { target: { value: "  Lê   Gia Huy " } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Bắt đầu" })));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    const saved = await getProfile();
    expect(saved?.displayName).toBe("Lê Gia Huy");
    expect(saved?.fieldUpdatedAt.displayName).toEqual(expect.any(Number));
  });

  it("stays open on Escape (AC-002)", async () => {
    render(<NamePrompt />);
    const dialog = await screen.findByRole("dialog", { name: "Bạn tên là gì?" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "Bạn tên là gì?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Close|Đóng/ })).not.toBeInTheDocument();
  });

  it("asks a learner from before names existed, keeping their progress (AC-005)", async () => {
    await saveProfile({ ...createDefaultProfile(0), level: "B1", placement: "done", tourSeen: true });
    render(<NamePrompt />);
    expect(await screen.findByRole("dialog", { name: "Bạn tên là gì?" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tên của bạn"), { target: { value: "Minh" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Bắt đầu" })));
    await waitFor(async () => expect(await getProfile()).toMatchObject({ displayName: "Minh", level: "B1", placement: "done", tourSeen: true }));
  });

  it("doesn't show once a name is stored", async () => {
    await saveProfile({ ...createDefaultProfile(0), displayName: "Minh" });
    render(<NamePrompt />);
    await act(async () => {});
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("NameSetting", () => {
  it("shows the stored name and saves a change with the same rules (AC-007)", async () => {
    await saveProfile({ ...createDefaultProfile(0), displayName: "Minh" });
    render(<NameSetting />);
    const input = await screen.findByLabelText("Tên của bạn");
    expect(input).toHaveValue("Minh");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu tên" }));
    expect(await screen.findByText(/Bạn nhập tên của mình nhé/)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Minh Anh" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Lưu tên" })));
    await waitFor(async () => expect((await getProfile())?.displayName).toBe("Minh Anh"));
  });
});
