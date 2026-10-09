import { test, expect } from "./fixture";

test.beforeEach(async ({ page, betaServer }) => {
  await betaServer.start();
  await page.goto("/phone");
  await page.getByLabel("Pairing code").fill(betaServer.code());
  await page.getByRole("button", { name: "Pair and open Commonplace" }).click();
  await expect(
    page.getByRole("button", { name: "Start 10-minute session" }),
  ).toBeVisible();
});

test("private service rejects unpaired reads, exports, actions, and foreign origins", async ({
  browser,
  page,
}) => {
  const outsider = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    for (const path of ["/api/state", "/api/export", "/api/ai-status"])
      expect(
        (await outsider.request.get(`https://127.0.0.1:3443${path}`)).status(),
      ).toBe(401);
    expect(
      (
        await outsider.request.post("https://127.0.0.1:3443/api/actions", {
          data: { type: "start", contractType: "cards", contractValue: 5 },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await page.request.post("/api/actions", {
          headers: { Origin: "https://evil.example" },
          data: { type: "start", contractType: "cards", contractValue: 5 },
        })
      ).status(),
    ).toBe(400);
  } finally {
    await outsider.close();
  }
});

test("iPhone layout, icons, and offline initialization are ready", async ({
  page,
}) => {
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/phone");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  for (const link of await page.getByRole("navigation").getByRole("link").all())
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(
    page.getByText("PRIVATE BETA · Ready for offline reading", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.screenshot({
    path: `test-results/iphone-beta-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("offline session, saved notes, deep dive, and restart preserve device data", async ({
  page,
  context,
  browserName,
  betaServer,
}) => {
  await expect(
    page.getByText("PRIVATE BETA · Ready for offline reading", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Idea budget" }).click();
  await page.getByRole("button", { name: "5 ideas", exact: true }).click();
  await page.getByRole("button", { name: "Start 5-idea session" }).click();
  const title = await page.locator(".idea-card h1").innerText();
  await context.setOffline(true);
  await page.getByRole("button", { name: "+ Save", exact: true }).click();
  await page.getByRole("button", { name: "Go deeper" }).click();
  await expect(
    page.getByRole("heading", { name: "How it works" }),
  ).toBeVisible();
  await page
    .getByLabel("A thought to keep")
    .fill("A note saved on my iPhone without the Mac.");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await page.getByLabel("Your question").fill("What is a concrete example?");
  await page.getByRole("button", { name: "Ask question" }).click();
  await expect(page.locator(".chat-log")).toContainText(
    "From your stored material",
  );
  // Playwright 1.63 WebKit rejects SW navigation under setOffline(true).
  // Stop the real origin instead, proving reload needs no running Mac service.
  if (browserName === "webkit") {
    await betaServer.stop();
    await context.setOffline(false);
  }
  await page.reload();
  await expect(page.getByLabel("A thought to keep")).toHaveValue(
    "A note saved on my iPhone without the Mac.",
  );
  await page
    .getByRole("link", { name: "Back to session", exact: false })
    .click();
  for (let index = 0; index < 4; index++)
    await page.getByRole("button", { name: "Next idea", exact: true }).click();
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "That’s the session you planned." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const cachedUrls = await page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (name) =>
          (await (await caches.open(name)).keys()).map(
            (request) => request.url,
          ),
        ),
      )
    ).flat(),
  );
  expect(cachedUrls.some((url) => url.includes("/api/"))).toBeFalsy();
});

test("offline pasted ingestion and device backup restore work", async ({
  page,
  context,
  browserName,
  betaServer,
}) => {
  await expect(
    page.getByText("PRIVATE BETA · Ready for offline reading", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await context.setOffline(true);
  await page.getByRole("link", { name: "Add a source", exact: true }).click();
  await page
    .getByLabel("Source title")
    .fill("A device-local source about constraints");
  await page
    .getByLabel("Source text")
    .fill(
      "Constraints make a design question more specific by removing possibilities that do not serve its purpose. A designer can compare a smaller set of feasible choices, then evaluate their tradeoffs against the intended use. This approach does not guarantee a good answer. A poorly chosen constraint can exclude a useful solution, so it should be stated explicitly and revised when evidence shows that it no longer fits the problem.",
    );
  await page.getByRole("button", { name: "Create a reviewable draft" }).click();
  await page.getByRole("button", { name: "Save reviewed idea" }).click();
  await expect(
    page.getByRole("heading", {
      name: "A device-local source about constraints",
      level: 1,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  // WebKit's offline flag also blocks file I/O in this runner. The stopped
  // origin keeps this restore disconnected without interfering with File.text.
  if (browserName === "webkit") {
    await betaServer.stop();
    await context.setOffline(false);
  }
  const snapshot = await page.evaluate(
    async () =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open("commonplace-phone-v1", 1);
        open.onsuccess = () => {
          const read = open.result
            .transaction("snapshot")
            .objectStore("snapshot")
            .get("current");
          read.onsuccess = () => {
            resolve(read.result.store);
            open.result.close();
          };
          read.onerror = () => reject(read.error);
        };
      }),
  );
  await page.getByText("Restore a device backup", { exact: true }).click();
  await page.getByLabel("JSON backup").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(snapshot)),
  });
  await page.getByLabel("Type REPLACE DEVICE DATA").fill("REPLACE DEVICE DATA");
  await page.getByRole("button", { name: "Restore device backup" }).click();
  await expect(
    page.getByText("Backup restored on this device.", { exact: true }),
  ).toBeVisible();
});

test("phone time expiry keeps the current topic and ends only on Next", async ({
  page,
  context,
}) => {
  await expect(
    page.getByText("PRIVATE BETA · Ready for offline reading", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.clock.install();
  await page.getByRole("button", { name: "Start 10-minute session" }).click();
  const title = await page.locator(".idea-card h1").innerText();
  await page.clock.fastForward(10 * 60 * 1000 + 5000);
  await expect(
    page.getByText("Your allotted time has run out.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".idea-card h1")).toHaveText(title);
  await page.getByRole("button", { name: "Dismiss time reminder" }).click();
  await page.getByRole("button", { name: "Go deeper" }).click();
  await expect(
    page.getByRole("heading", { name: "How it works" }),
  ).toBeVisible();
  await page.getByLabel("Your question").fill("What is a concrete example?");
  await page.getByRole("button", { name: "Ask question" }).click();
  await expect(page.locator(".chat-log")).toContainText(
    "From your stored material",
  );
  await expect(
    page.getByText("Your allotted time has run out.", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Back to session", exact: false })
    .click();
  await expect(page.locator(".idea-card h1")).toHaveText(title);
  await page.getByRole("button", { name: "Next idea", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "That’s the session you planned." }),
  ).toBeVisible();
});

test("phone Enough pauses rapid passive reading offline", async ({
  page,
  context,
}) => {
  await expect(
    page.getByText("PRIVATE BETA · Ready for offline reading", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Idea budget" }).click();
  await page.getByRole("button", { name: "15 ideas", exact: true }).click();
  await page.getByRole("button", { name: "Start 15-idea session" }).click();
  for (let index = 0; index < 10; index++)
    await page.getByRole("button", { name: "Next idea", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Enough.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next idea", exact: true }),
  ).toHaveCount(0);
  await page.getByText("Choose to continue", { exact: true }).click();
  await page.getByRole("button", { name: "Continue for 5 minutes" }).click();
  await expect(page.locator(".session-progress")).toContainText("5 min left");
});
