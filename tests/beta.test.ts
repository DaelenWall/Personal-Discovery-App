import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BetaAccess,
  betaCookie,
  isPrivateIPv4,
} from "../src/server/beta-access";
import { validateSnapshot } from "../src/domain/snapshot";
import { createSeedStore } from "../src/data/seed";
import { assertLocalRequest } from "../src/server/http";

test("private beta requires the exact device credential and pairs with a bounded code", () => {
  const access = new BetaAccess("a-long-private-device-token", 1000);
  assert.equal(access.authorized(undefined), false);
  assert.equal(access.authorized(`${betaCookie}=wrong`), false);
  assert.equal(
    access.authorized(`${betaCookie}=a-long-private-device-token`),
    true,
  );
  assert.equal(access.pair(access.code.toLowerCase(), "device", 1001), true);
  assert.equal(access.pair(access.code, "device", 1000 + 31 * 60_000), false);
  assert.match(access.cookie(), /HttpOnly; Secure; SameSite=Strict/);
});
test("pairing attempts are rate limited without locking out another device", () => {
  const access = new BetaAccess("token", 1000);
  for (let index = 0; index < 10; index++)
    assert.equal(access.pair("wrong", "device", 1001), false);
  assert.equal(access.pair(access.code, "device", 1001), false);
  assert.equal(access.pair(access.code, "other-device", 1001), true);
  assert.equal(access.pair(access.code, "device", 62000), true);
});
test("LAN launch permits private addresses and rejects public or wildcard binding", () => {
  for (const ip of ["192.168.1.46", "10.1.2.3", "172.16.0.2"])
    assert.equal(isPrivateIPv4(ip), true);
  for (const ip of [
    "0.0.0.0",
    "8.8.8.8",
    "172.32.0.1",
    "127.0.0.1",
    "192.168.999.1",
    "example.com",
  ])
    assert.equal(isPrivateIPv4(ip), false);
});
test("snapshot transfer preserves seeds and rejects broken provenance or session references", () => {
  const store = createSeedStore();
  assert.deepEqual(validateSnapshot(store), store);
  const missingSource = structuredClone(store);
  missingSource.ideas[0].sourceId = "missing";
  assert.throws(() => validateSnapshot(missingSource));
  const duplicated = structuredClone(store);
  duplicated.ideas.push(duplicated.ideas[0]);
  assert.throws(() => validateSnapshot(duplicated));
  const scriptUrl = structuredClone(store);
  scriptUrl.sources[0].url = "javascript:alert(1)";
  assert.throws(() => validateSnapshot(scriptUrl));
  const brokenRecall = structuredClone(store);
  brokenRecall.ideas[0].recall!.answer = 9;
  assert.throws(() => validateSnapshot(brokenRecall));
});
test("only an explicitly configured HTTPS beta origin is allowed", () => {
  const previous = process.env.DISCOVERY_BETA_ORIGIN;
  try {
    process.env.DISCOVERY_BETA_ORIGIN = "https://my-mac.local:4433";
    const request = (origin: string) =>
      new Request("http://localhost:4433/api/actions", {
        headers: { host: "my-mac.local:4433", origin },
      });
    assert.doesNotThrow(() =>
      assertLocalRequest(request("https://my-mac.local:4433")),
    );
    assert.throws(() =>
      assertLocalRequest(request("http://my-mac.local:4433")),
    );
    assert.throws(() => assertLocalRequest(request("https://evil.example")));
  } finally {
    if (previous === undefined) delete process.env.DISCOVERY_BETA_ORIGIN;
    else process.env.DISCOVERY_BETA_ORIGIN = previous;
  }
});
