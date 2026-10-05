import test from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../next.config.mjs";

test("global security headers are configured", async () => {
  const rules = await nextConfig.headers();
  const headers = new Map(rules[0].headers.map(({ key, value }) => [key, value]));
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.match(headers.get("Permissions-Policy"), /camera=\(\)/);
  assert.equal(nextConfig.poweredByHeader, false);
});
