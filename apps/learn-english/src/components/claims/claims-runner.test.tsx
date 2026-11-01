import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { getClaims, putClaims } from "@/storage/claims";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";
import { ClaimsRunner } from "./claims-runner";

const NOW = Date.UTC(2026, 10, 2, 3);

beforeEach(async () => {
  await resetStorage();
  await saveProfile({ ...createDefaultProfile(NOW, () => "0f8fad5b-d9cb-469f-a165-70867728950e"), timeZone: "Asia/Ho_Chi_Minh" });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ claims: [] }), { status: 200 })));
});

afterEach(() => vi.unstubAllGlobals());

describe("ClaimsRunner (016 AC-015)", () => {
  it("shows a rejected claim once, with the answer, the reference and the explanation", async () => {
    await putClaims([
      {
        id: "c1",
        sentenceId: "sentence:sea",
        answer: "Shut your eyes and picture the sea.",
        expected: "Close your eyes and imagine the sea.",
        vi: "Nhắm mắt lại và tưởng tượng biển cả.",
        related: [],
        createdAt: NOW,
        status: "rejected",
        explanationVi: "Câu cần giữ nghĩa “tưởng tượng”.",
        updatedAt: NOW,
      },
    ]);
    render(<ClaimsRunner />);

    expect(await screen.findByRole("dialog", { name: "Câu bạn gửi chưa đúng" })).toBeInTheDocument();
    expect(screen.getByText("Shut your eyes and picture the sea.")).toBeInTheDocument();
    expect(screen.getByText("Close your eyes and imagine the sea.")).toBeInTheDocument();
    expect(screen.getByText("Câu cần giữ nghĩa “tưởng tượng”.")).toBeInTheDocument();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Đã hiểu" })));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await vi.waitFor(async () => expect((await getClaims())[0].status).toBe("shown"));
  });

  it("shows nothing when no claim was rejected", async () => {
    render(<ClaimsRunner />);
    await act(async () => {});
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
