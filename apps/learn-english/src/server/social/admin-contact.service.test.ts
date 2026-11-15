// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { socialDb } from "@/test-utils/social-db";
import { adminContact } from "./admin-contact.service";

const NOW = Date.parse("2026-11-15T10:00:00Z");
let handle: ReturnType<typeof socialDb>;

function makeAdmin(id: string, createdAt = NOW) {
  handle.sqlite.exec(`UPDATE user SET is_admin = 1, created_at = ${createdAt} WHERE id = '${id}'`);
}

beforeEach(() => {
  handle = socialDb(NOW);
});

describe("admin contact (feature 044)", () => {
  it("gives a learner the oldest admin's id, name and picture (AC-004)", async () => {
    makeAdmin("khoa", NOW - 1000);
    makeAdmin("minh", NOW - 5000);
    expect(await adminContact(handle.db, "lan")).toEqual({ admin: { id: "minh", name: "Minh Anh", image: "https://example.com/minh.png" } });
  });

  it("gives an admin no admin to befriend (AC-003)", async () => {
    makeAdmin("minh", NOW - 5000);
    makeAdmin("khoa");
    expect(await adminContact(handle.db, "minh")).toEqual({ admin: null });
    expect(await adminContact(handle.db, "khoa")).toEqual({ admin: null });
  });

  it("gives no admin when there is none (AC-005)", async () => {
    expect(await adminContact(handle.db, "lan")).toEqual({ admin: null });
  });
});
