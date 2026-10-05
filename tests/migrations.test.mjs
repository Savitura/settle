import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("operations migration is repeatable and creates required records", async () => {
  const migration = await readFile(new URL("../drizzle/0003_operations.sql", import.meta.url), "utf8");
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "role"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "notifications"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "audit_events"/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "failure_reason"/);
});
