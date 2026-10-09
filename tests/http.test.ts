import assert from "node:assert/strict";
import { test } from "node:test";
import { assertLocalRequest } from "../src/server/http";

test("same-origin checks use the actual Host when Next normalizes the internal URL", () => {
  assert.doesNotThrow(() =>
    assertLocalRequest(
      new Request("http://localhost:3100/api/actions", {
        headers: {
          host: "127.0.0.1:3100",
          origin: "http://127.0.0.1:3100",
          "sec-fetch-site": "same-origin",
        },
      }),
    ),
  );
});
test("mutations reject foreign origins and non-local hosts", () => {
  assert.throws(() =>
    assertLocalRequest(
      new Request("http://localhost:3100/api/actions", {
        headers: { host: "127.0.0.1:3100", origin: "https://evil.example" },
      }),
    ),
  );
  assert.throws(() =>
    assertLocalRequest(
      new Request("http://localhost:3100/api/actions", {
        headers: { host: "rebinding.example" },
      }),
    ),
  );
});
