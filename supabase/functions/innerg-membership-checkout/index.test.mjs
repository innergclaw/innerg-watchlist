import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

test("checkout keeps the approved ten-dollar monthly subscription", () => {
  assert.match(source, /const MONTHLY_AMOUNT = 1000;/);
  assert.match(source, /mode: "subscription"/);
  assert.match(source, /recurring: \{ interval: "month" \}/);
});

test("checkout binds the signed-in member to Stripe", () => {
  assert.match(source, /client_reference_id: user\.id/);
  assert.match(source, /metadata: \{ membership_type: "innerg_founding", monthly_amount_cents: String\(MONTHLY_AMOUNT\), user_id: user\.id \}/);
  assert.match(source, /authClient\.auth\.getUser\(token\)/);
});

test("paid checkout returns directly to the protected Media Hub", () => {
  assert.match(source, /https:\/\/nasirr\.innergintel\.org\/innerg-id\/\?membership=success#media-hub/);
  assert.match(source, /alreadyActive: true, returnUrl: "https:\/\/nasirr\.innergintel\.org\/innerg-id\/"/);
});

test("checkout secrets remain server-side", () => {
  assert.match(source, /Deno\.env\.get\("STRIPE_SECRET_KEY"\)/);
  assert.doesNotMatch(source, /sk_(test|live)_/);
  assert.doesNotMatch(source, /service_role\s*[:=]\s*["']/i);
});
