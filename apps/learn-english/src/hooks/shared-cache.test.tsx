import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadContent, refreshIfChanged } from "@/content/client";
import type { Level } from "@/learning/types";
import { closeBroadcast, notifyChanged } from "@/storage/broadcast";
import { render } from "@/test-utils/render";
import { useAllWords } from "./use-all-words";
import { useContentIndex } from "./use-content-index";
import { useStorageQuery } from "./use-storage-query";

// Feature 005: one in-memory cache shared by every screen.

vi.mock("@/content/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/content/client")>();
  return {
    ...actual,
    loadContent: vi.fn(),
    loadTombstones: vi.fn(async () => new Set<string>()),
    refreshIfChanged: vi.fn(async () => false),
  };
});

const loadContentMock = vi.mocked(loadContent);
const refreshMock = vi.mocked(refreshIfChanged);
let served = { version: 1, stale: false };

function calls(kind: string, level?: Level) {
  return loadContentMock.mock.calls.filter(([k, l]) => k === kind && l === level).length;
}

function Index({ levels, label }: { levels: Level[]; label: string }) {
  const content = useContentIndex(levels);
  return <p>{`${label}: ${content.status}`}</p>;
}

function AllWords() {
  const all = useAllWords(true);
  return <p>{`all: ${all.status}`}</p>;
}

beforeEach(() => {
  served = { version: 1, stale: false };
  loadContentMock.mockReset();
  loadContentMock.mockImplementation(async () => ({ items: [], ...served }));
  refreshMock.mockReset();
  refreshMock.mockResolvedValue(false);
});

afterEach(() => closeBroadcast());

describe("shared content cache", () => {
  it("loads each kind/level once for two components that need it at the same time (AC-002)", async () => {
    render(
      <>
        <Index levels={["A1"]} label="list" />
        <Index levels={["A1"]} label="search" />
      </>,
    );
    await screen.findByText("list: ready");
    expect(screen.getByText("search: ready")).toBeInTheDocument();
    expect(calls("grammar")).toBe(1);
    expect(calls("word", "A1")).toBe(1);
    expect(calls("sentence", "A1")).toBe(1);
    expect(calls("writing", "A1")).toBe(1);
  });

  it("shows remembered content at once when a screen opens again, without loading it again (AC-001)", async () => {
    const { rerender } = render(<Index levels={["A1"]} label="vocabulary" />);
    await screen.findByText("vocabulary: ready");
    rerender(<p>another screen</p>);
    const before = loadContentMock.mock.calls.length;
    rerender(<Index levels={["A1"]} label="vocabulary" />);
    expect(screen.getByText("vocabulary: ready")).toBeInTheDocument();
    expect(loadContentMock.mock.calls.length).toBe(before);
  });

  it("reuses a level loaded for one screen on another that needs it (AC-003)", async () => {
    const { rerender } = render(<Index levels={["A1", "A2"]} label="lesson" />);
    await screen.findByText("lesson: ready");
    rerender(<AllWords />);
    await screen.findByText("all: ready");
    expect(calls("word", "A1")).toBe(1);
    expect(calls("word", "A2")).toBe(1);
    expect(calls("word", "B2")).toBe(1);
  });

  it("loads the new levels after a level change and keeps the old ones", async () => {
    const { rerender } = render(<Index levels={["A1", "A2"]} label="today" />);
    await screen.findByText("today: ready");
    rerender(<Index levels={["A2", "B1"]} label="today" />);
    await screen.findByText("today: ready");
    expect(calls("word", "A2")).toBe(1);
    expect(calls("word", "B1")).toBe(1);
  });

  it("reloads content on window focus when a new version was published (AC-004)", async () => {
    render(<Index levels={["A1"]} label="grammar" />);
    await screen.findByText("grammar: ready");
    refreshMock.mockResolvedValue(true);
    await act(async () => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(calls("word", "A1")).toBe(2));
  });

  it("keeps content on focus when nothing was published", async () => {
    render(<Index levels={["A1"]} label="grammar" />);
    await screen.findByText("grammar: ready");
    await act(async () => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(calls("word", "A1")).toBe(1);
  });

  it("tries again on focus when what is shown came from an earlier download (AC-007)", async () => {
    served = { version: 1, stale: true };
    render(<Index levels={["A1"]} label="offline" />);
    await screen.findByText("offline: ready");
    served = { version: 1, stale: false };
    await act(async () => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(calls("word", "A1")).toBe(2));
  });

  it("loads again on retry instead of repeating the remembered error (AC-008)", async () => {
    loadContentMock.mockRejectedValueOnce(new Error("offline"));
    function WithRetry() {
      const content = useContentIndex(["A1"]);
      return (
        <button type="button" onClick={content.retry}>
          {content.status}
        </button>
      );
    }
    render(<WithRetry />);
    await act(async () => (await screen.findByRole("button", { name: "error" })).click());
    expect(await screen.findByRole("button", { name: "ready" })).toBeInTheDocument();
  });
});

describe("shared storage queries", () => {
  function Count({ read, label }: { read: () => Promise<number>; label: string }) {
    const query = useStorageQuery(["count"], read, ["cards"]);
    return <p>{`${label}: ${query.status === "ready" ? query.data : query.status}`}</p>;
  }

  it("reads once for two components with the same key (AC-002)", async () => {
    const read = vi.fn(async () => 1);
    render(
      <>
        <Count read={read} label="a" />
        <Count read={read} label="b" />
      </>,
    );
    await screen.findByText("a: 1");
    expect(screen.getByText("b: 1")).toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("re-reads when a watched store changes (AC-005)", async () => {
    let value = 1;
    const read = vi.fn(async () => value);
    render(<Count read={read} label="due" />);
    await screen.findByText("due: 1");
    value = 2;
    act(() => notifyChanged(["cards"]));
    expect(await screen.findByText("due: 2")).toBeInTheDocument();
  });

  it("shows the remembered result when opened again and re-reads it in the background (AC-006)", async () => {
    let value = 1;
    const read = vi.fn(async () => value);
    const { rerender } = render(<Count read={read} label="due" />);
    await screen.findByText("due: 1");
    rerender(<p>elsewhere</p>);
    value = 3;
    rerender(<Count read={read} label="due" />);
    expect(screen.getByText("due: 1")).toBeInTheDocument();
    expect(await screen.findByText("due: 3")).toBeInTheDocument();
  });

  it("waits for a new read on a screen opened right after a write in this tab (AC-006)", async () => {
    let value = 1;
    const read = vi.fn(async () => value);
    const { rerender } = render(<Count read={read} label="placement" />);
    await screen.findByText("placement: 1");
    rerender(<p>navigating</p>);
    value = 2;
    notifyChanged(["cards"]);
    rerender(<Count read={read} label="home" />);
    expect(screen.getByText("home: loading")).toBeInTheDocument();
    expect(await screen.findByText("home: 2")).toBeInTheDocument();
  });
});
