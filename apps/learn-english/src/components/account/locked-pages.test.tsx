import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";
import HomePage from "@/app/(app)/page";
import HardWordsPage from "@/app/(app)/hard-words/page";
import ProfilePage from "@/app/(app)/profile/page";
import ReviewPage from "@/app/(app)/review/page";
import LessonPage from "@/app/(focus)/lesson/page";
import ExtraLessonPage from "@/app/(focus)/extra-lesson/page";
import ReviewSessionPage from "@/app/(focus)/review-session/page";

// Feature 022: the lesson and review areas ask guests to sign in (AC-010, AC-011).

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

function stubSession(signedIn: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL) =>
      String(url) === "/api/auth/get-session" ? Response.json(signedIn ? { user: { id: "u1", name: "Minh", email: "m@example.com" }, session: {} } : null) : new Response("{}", { status: 503 }),
    ),
  );
}

beforeEach(async () => {
  await resetStorage();
  await saveProfile({ ...createDefaultProfile(0, () => "device-a"), displayName: "Minh", placement: "skipped" });
});

afterEach(() => vi.unstubAllGlobals());

describe.each([
  ["the home page's lesson", HomePage, "Đăng nhập để học bài hôm nay"],
  ["the lesson screen", LessonPage, "Đăng nhập để học bài hôm nay"],
  ["an extra lesson", ExtraLessonPage, "Đăng nhập để học bài hôm nay"],
  ["Ôn tập", ReviewPage, "Đăng nhập để ôn tập"],
  ["a review session", ReviewSessionPage, "Đăng nhập để ôn tập"],
  ["Từ khó", HardWordsPage, "Đăng nhập để xem từ khó"],
  ["Hồ sơ", ProfilePage, "Đăng nhập để xem hồ sơ"],
])("%s", (_, Page, prompt) => {
  it("shows guests a sign-in prompt instead", async () => {
    stubSession(false);
    render(
      <SidebarProvider>
        <Page />
      </SidebarProvider>,
    );
    expect(await screen.findByText(prompt)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đăng nhập với Google" })).toBeInTheDocument();
  });

  it("doesn't ask a signed-in learner", async () => {
    stubSession(true);
    render(
      <SidebarProvider>
        <Page />
      </SidebarProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByText(prompt)).not.toBeInTheDocument();
  });
});
