import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { getAiKeys, resetAiKeysForTest, updateAiKey } from "@/lib/ai-keys";
import { AiGradingSetting } from "./ai-grading-setting";

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const ok = () => json(200, { models: [] });

beforeEach(() => {
  localStorage.clear();
  resetAiKeysForTest();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function add(key: string) {
  fireEvent.change(screen.getByLabelText("Thêm khóa API"), { target: { value: key } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Thêm khóa" })));
}

describe("AiGradingSetting (033)", () => {
  it("explains what is sent where, the free-tier terms and links to a free key (AC-001)", () => {
    render(<AiGradingSetting />);
    expect(screen.getByText(/chỉ lưu trên thiết bị này, không gửi lên máy chủ/)).toBeInTheDocument();
    expect(screen.getByText(/đề bài tiếng Việt và bài bạn viết được gửi thẳng tới Google/)).toBeInTheDocument();
    expect(screen.getByText(/18 tuổi trở lên/)).toBeInTheDocument();
    expect(screen.getByText(/cùng một tài khoản dùng chung lượt/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tạo khóa miễn phí" })).toHaveAttribute("href", "https://aistudio.google.com/apikey");
    expect(screen.getByText(/chưa thêm khóa nào/)).toBeInTheDocument();
    expect(screen.getByLabelText("Thêm khóa API")).toHaveAttribute("type", "password");
  });

  it("checks a key with Google before saving it, and lists it masked (AC-002, AC-003)", async () => {
    fetchMock.mockResolvedValueOnce(ok());
    render(<AiGradingSetting />);
    await add("  AIzaSyExample-key-7788 ");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toContain("generativelanguage.googleapis.com");
    expect(getAiKeys().map((key) => key.key)).toEqual(["AIzaSyExample-key-7788"]);
    const list = screen.getByRole("list", { name: "Khóa API, theo thứ tự dùng" });
    expect(within(list).getByText("••••7788")).toBeInTheDocument();
    expect(within(list).getByText("Đang dùng được")).toBeInTheDocument();
    expect(list).not.toHaveTextContent("AIzaSyExample");
    expect(screen.getByText(/Đã thêm khóa/)).toBeInTheDocument();
  });

  it("doesn't save a key Google refuses, a duplicate, or one it couldn't check", async () => {
    fetchMock
      .mockResolvedValueOnce(json(400, { error: { status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } }))
      .mockResolvedValueOnce(ok())
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<AiGradingSetting />);
    await add("bad-key");
    expect(screen.getByText(/Google không nhận khóa này/)).toBeInTheDocument();
    await add("good-key");
    await add("good-key");
    expect(screen.getByText("Khóa này đã có trong danh sách.")).toBeInTheDocument();
    await add("other-key");
    expect(screen.getByText(/Chưa kiểm tra được khóa/)).toBeInTheDocument();
    expect(getAiKeys().map((key) => key.key)).toEqual(["good-key"]);
  });

  it("reorders and removes keys, and shows a refused key's reason (AC-003, AC-014)", async () => {
    fetchMock.mockResolvedValue(ok());
    render(<AiGradingSetting />);
    await add("key-aaaa");
    await add("key-bbbb");
    act(() => updateAiKey(getAiKeys()[0]!.id, { status: "invalid", reasonVi: "Google cần bạn xác minh tài khoản." }));
    expect(screen.getByText("Không hợp lệ")).toBeInTheDocument();
    expect(screen.getByText("Google cần bạn xác minh tài khoản.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Đưa Khóa 2 (••••bbbb) lên trước" }));
    expect(getAiKeys().map((key) => key.key)).toEqual(["key-bbbb", "key-aaaa"]);
    fireEvent.click(screen.getByRole("button", { name: "Xóa Khóa 2 (••••aaaa)" }));
    expect(getAiKeys().map((key) => key.key)).toEqual(["key-bbbb"]);
    expect(screen.getByRole("button", { name: "Đưa Khóa 1 (••••bbbb) lên trước" })).toBeDisabled();
  });

  it("shows a key out of quota until Google's reset", async () => {
    fetchMock.mockResolvedValue(ok());
    render(<AiGradingSetting />);
    await add("key-aaaa");
    act(() => updateAiKey(getAiKeys()[0]!.id, { status: "quota", skipUntil: Date.now() + 3_600_000 }));
    expect(screen.getByText("Hết lượt hôm nay")).toBeInTheDocument();
  });
});
