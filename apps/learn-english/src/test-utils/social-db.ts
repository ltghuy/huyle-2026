import { sqliteDb } from "@/test-utils/sqlite-d1";

/** A fresh database with foreign keys on and three learners: minh, lan and khoa. */
export function socialDb(now: number) {
  const handle = sqliteDb();
  handle.sqlite.exec("PRAGMA foreign_keys = ON");
  for (const [id, name] of [["minh", "Minh Anh"], ["lan", "Lan"], ["khoa", "Khoa"]]) {
    handle.sqlite.exec(`INSERT INTO user (id, name, email, image, created_at, updated_at) VALUES ('${id}', '${name}', '${id}@example.com', 'https://example.com/${id}.png', ${now}, ${now})`);
  }
  return handle;
}
