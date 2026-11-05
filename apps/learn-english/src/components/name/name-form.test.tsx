import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { NameSetting } from "@/components/settings/name-setting";
import { createDefaultProfile, getProfile, saveProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";

beforeEach(async () => {
  await resetStorage();
});

describe("NameSetting", () => {
  it("shows the stored name and saves a change with the same rules (AC-003, AC-004, AC-007)", async () => {
    await saveProfile({ ...createDefaultProfile(0), displayName: "Minh" });
    render(<NameSetting />);
    const input = await screen.findByLabelText("Tên gọi (không bắt buộc)");
    expect(input).toHaveValue("Minh");

    fireEvent.change(input, { target: { value: " 42 " } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu tên" }));
    expect(await screen.findByText(/Bạn nhập tên của mình nhé/)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Minh Anh" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Lưu tên" })));
    await waitFor(async () => expect((await getProfile())?.displayName).toBe("Minh Anh"));
    expect((await getProfile())?.fieldUpdatedAt.displayName).toEqual(expect.any(Number));
  });
});
