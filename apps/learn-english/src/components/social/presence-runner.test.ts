import { describe, expect, it } from "vitest";
import { createTabTracker } from "./presence-runner";
import { relationOf, sortFriends } from "./use-social";

type Message = Parameters<Parameters<typeof createTabTracker>[0]>[0];

/** Tabs wired to each other like a BroadcastChannel: a message reaches every other tab. */
function tabs(count: number) {
  const list: ReturnType<typeof createTabTracker>[] = [];
  for (let i = 0; i < count; i++) {
    list.push(createTabTracker((message: Message) => list.forEach((tab, j) => j !== i && tab.receive(message)), `tab${i}`));
  }
  list.forEach((tab) => tab.announce());
  return list;
}

describe("presence tabs (feature 031, AC-015)", () => {
  it("says goodbye only from the last open tab", () => {
    const [a, b] = tabs(2);
    expect(a.leave()).toBe(false);
    expect(b.leave()).toBe(true);
  });

  it("a lone tab is the last", () => {
    expect(tabs(1)[0].leave()).toBe(true);
  });
});

describe("relation and order (feature 031)", () => {
  const data = {
    friends: [{ id: "lan", name: "Lan", image: null, online: true, lastSeenAt: 1 }],
    outgoing: ["khoa"],
    incoming: ["hoa"],
  };

  it("names each state (AC-003, AC-007, AC-008)", () => {
    expect(relationOf(data, "minh", "minh")).toBe("self");
    expect(relationOf(data, "minh", "lan")).toBe("friends");
    expect(relationOf(data, "minh", "khoa")).toBe("sent");
    expect(relationOf(data, "minh", "hoa")).toBe("incoming");
    expect(relationOf(data, "minh", "tu")).toBe("none");
    expect(relationOf(undefined, "minh", "tu")).toBe("none");
  });

  it("puts online friends first, then the most recently active (AC-014)", () => {
    const friends = [
      { id: "a", name: "A", image: null, online: false, lastSeenAt: 5 },
      { id: "b", name: "B", image: null, online: true, lastSeenAt: 1 },
      { id: "c", name: "C", image: null, online: false, lastSeenAt: null },
      { id: "d", name: "D", image: null, online: false, lastSeenAt: 9 },
    ];
    expect(sortFriends(friends).map((f) => f.id)).toEqual(["b", "d", "a", "c"]);
  });
});
