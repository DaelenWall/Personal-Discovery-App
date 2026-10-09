import { test, expect } from "@playwright/test";
import { SqliteRepository } from "../../src/server/repository";
import { tmpdir } from "node:os";
import { join } from "node:path";

function expireTestSession(databasePath: string) {
  expect(
    databasePath.startsWith(join(tmpdir(), "discovery-e2e-")),
  ).toBeTruthy();
  const db = new SqliteRepository(databasePath);
  try {
    db.update((store) => {
      const session = store.sessions.find(
        (entry) => entry.status === "active",
      )!;
      session.deadline = new Date(Date.now() - 1000).toISOString();
      return store;
    });
  } finally {
    db.close();
  }
}

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/reset", {
    data: { confirm: "DELETE MY LOCAL DATA" },
  });
  expect(response.ok()).toBeTruthy();
});

test("start → save → recall → end → summary → persistent library", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Idea budget" })).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-home.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Idea budget" }).click();
  await page.getByRole("button", { name: "Start 10-idea session" }).click();
  await expect(page).toHaveURL(/\/session\//);
  const title = await page.locator(".idea-card h1").innerText();
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "+ Save", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "✓ Saved", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Next idea", exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "What stayed with you?" }),
  ).toBeVisible();
  const { store } = await (await request.get("/api/state")).json();
  const session = store.sessions[0];
  const recalled = store.ideas.find(
    (idea: { id: string }) => idea.id === session.recallIdeaId,
  );
  await page
    .getByRole("button", {
      name: recalled.recall.options[recalled.recall.answer],
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("got it");
  await page.getByRole("button", { name: "End session", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your attention can rest." }),
  ).toBeVisible();
  await expect(page.locator(".summary-stats")).toContainText("5");
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const persisted = (await (await request.get("/api/state")).json()).store;
  expect(
    persisted.concepts.some(
      (concept: { successfulRecalls: number }) => concept.successfulRecalls > 0,
    ),
  ).toBeTruthy();
  expect(persisted.sessions[0].status).toBe("ended");
});

test("refresh resumes the same finite batch and card contract stops", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Idea budget" }).click();
  await page.getByRole("button", { name: "5 ideas", exact: true }).click();
  await page.getByRole("button", { name: "Start 5-idea session" }).click();
  const title = await page.locator(".idea-card h1").innerText();
  const before = (await (await request.get("/api/state")).json()).store
    .sessions[0].ideaIds;
  await page.reload();
  await expect(page.locator(".idea-card h1")).toHaveText(title);
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Next idea", exact: true }).click();
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "That’s the session you planned." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next idea", exact: true }),
  ).toHaveCount(0);
  expect(
    (await (await request.get("/api/state")).json()).store.sessions[0].ideaIds,
  ).toEqual(before);
});

test("rapid passive reading shows Enough and requires explicit continuation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Idea budget" }).click();
  await page.getByRole("button", { name: "15 ideas", exact: true }).click();
  await page.getByRole("button", { name: "Start 15-idea session" }).click();
  for (let i = 0; i < 10; i++)
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

test("deep dive, demo Ask, notes, and reviewed text ingestion work without a key", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start 10-minute session" }).click();
  await page.getByRole("button", { name: "Go deeper" }).click();
  await expect(
    page.getByRole("heading", { name: "How it works" }),
  ).toBeVisible();
  await page.getByLabel("Your question").fill("What is a concrete example?");
  await page.getByRole("button", { name: "Ask question" }).click();
  await expect(page.locator(".chat-log")).toContainText(
    "From your stored material",
  );
  await page
    .getByLabel("A thought to keep")
    .fill("A personal connection worth keeping.");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("A thought to keep")).toHaveValue(
    "A personal connection worth keeping.",
  );
  await page.getByRole("link", { name: "Add a source", exact: true }).click();
  await page
    .getByLabel("Source title")
    .fill("A testable explanation of model limits");
  await page
    .getByLabel("Source text")
    .fill(
      "Scientific models simplify complex systems by preserving relationships relevant to a particular question. A useful model allows predictions to be compared with observations. Its assumptions should be stated clearly, because a model that works in one setting can fail when surrounding conditions change. Comparison with alternative models helps reveal which simplifications matter and which evidence would distinguish competing explanations.",
    );
  await page.getByRole("button", { name: "Create a reviewable draft" }).click();
  await expect(page.getByText("PREVIEW · NOTHING SAVED YET")).toBeVisible();
  await page.getByRole("button", { name: "Save reviewed idea" }).click();
  await expect(
    page.getByRole("heading", {
      name: "A testable explanation of model limits",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
});

test("mobile start screen is readable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Start 10-minute session" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: true,
  });
});

test("known and dismissed feedback advance deliberately and persist", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Idea budget" }).click();
  await page.getByRole("button", { name: "5 ideas", exact: true }).click();
  await page.getByRole("button", { name: "Start 5-idea session" }).click();
  await page.getByRole("button", { name: "+ Save", exact: true }).click();
  await page
    .getByRole("button", { name: "Already know this", exact: true })
    .click();
  await expect(page.locator(".session-progress")).toContainText("2 of 5 ideas");
  await page.getByRole("button", { name: "Not for me", exact: true }).click();
  await expect(page.locator(".session-progress")).toContainText("3 of 5 ideas");
  const store = (await (await request.get("/api/state")).json()).store;
  expect(
    store.states.some(
      (state: { status: string; saved: boolean }) =>
        state.status === "known" && state.saved,
    ),
  ).toBeTruthy();
  expect(
    store.states.some(
      (state: { status: string }) => state.status === "dismissed",
    ),
  ).toBeTruthy();
});

test("preferences, custom topics, dark mode, export, and confirmed reset", async ({
  page,
  request,
}) => {
  await page.goto("/settings");
  await page.getByLabel("Default time budget (minutes)").fill("20");
  await page.getByLabel("Enough sensitivity").selectOption("balanced");
  await page.getByLabel("Appearance").selectOption("dark");
  await page.getByLabel("Science preference", { exact: true }).press("End");
  await page.getByLabel("Add your own topic").fill("Ecology");
  await page.getByRole("button", { name: "Add topic", exact: true }).click();
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Preferences saved locally" }),
  ).toContainText("Preferences saved locally");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.getByLabel("Default time budget (minutes)")).toHaveValue(
    "20",
  );
  const exported = await (await request.get("/api/export")).json();
  expect(exported.settings.topicWeights.Science).toBe(1);
  expect(exported.settings.topicWeights.Ecology).toBe(0);
  await page.getByRole("link", { name: "Discover", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start 20-minute session" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByText("Delete local data", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Delete and restore demo" }),
  ).toBeDisabled();
  await page
    .getByLabel("Type DELETE MY LOCAL DATA")
    .fill("DELETE MY LOCAL DATA");
  await page.getByRole("button", { name: "Delete and restore demo" }).click();
  await expect(
    page.getByRole("button", { name: "Start 10-minute session" }),
  ).toBeVisible();
});

test("timed reading shows a removable reminder, allows depth and Ask, and ends on Next", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start 10-minute session" }).click();
  const title = await page.locator(".idea-card h1").innerText();
  const sessionUrl = page.url();
  expireTestSession(String(testInfo.config.metadata.databasePath));
  await page.reload();
  await expect(
    page.getByText("Your allotted time has run out.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".idea-card h1")).toHaveText(title);
  let releaseAnswer: () => void = () => {};
  const answerPending = new Promise<void>((resolve) => {
    releaseAnswer = resolve;
  });
  await page.route("**/api/ask", async (route) => {
    await answerPending;
    await route.continue();
  });
  await page.getByRole("link", { name: "Ask a question" }).click();
  await page.getByLabel("Your question").fill("What is the mechanism?");
  await page.getByRole("button", { name: "Ask question" }).click();
  await expect(page.getByRole("button", { name: "Working…" })).toBeVisible();
  await page.getByRole("button", { name: "Dismiss time reminder" }).click();
  await expect(
    page.getByText("Your allotted time has run out.", { exact: true }),
  ).toHaveCount(0);
  releaseAnswer();
  await expect(page.locator(".chat-log")).toContainText(
    "From your stored material",
  );
  await expect(
    page.getByRole("heading", { name: "How it works" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your allotted time has run out.", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Your question").fill("What is a concrete example?");
  await page.getByRole("button", { name: "Ask question" }).click();
  await expect(page.locator(".chat-log")).toContainText(
    "From your stored material",
  );
  const before = (await (await request.get("/api/state")).json()).store;
  expect(before.sessions[0].status).toBe("active");
  expect(before.sessions[0].currentIndex).toBe(0);
  await page.goto(sessionUrl);
  await expect(page.locator(".idea-card h1")).toHaveText(title);
  await expect(
    page.getByText("Your allotted time has run out.", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Next idea", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "That’s the session you planned." }),
  ).toBeVisible();
  const after = (await (await request.get("/api/state")).json()).store;
  expect(after.sessions[0].currentIndex).toBe(0);
  expect(
    after.events.filter(
      (event: { type: string }) => event.type === "card_view",
    ),
  ).toHaveLength(1);
});

test("deadline reached in a deep dive leaves its question and notes intact", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start 10-minute session" }).click();
  await page.getByRole("button", { name: "Go deeper" }).click();
  await page.getByLabel("Your question").fill("A question I am still writing");
  await page.getByLabel("A thought to keep").fill("My unfinished note");
  expireTestSession(String(testInfo.config.metadata.databasePath));
  // The heartbeat reads the server deadline; the page is never navigated away.
  await expect(
    page.getByText("Your allotted time has run out.", { exact: true }),
  ).toBeVisible({ timeout: 12000 });
  await expect(page.getByLabel("Your question")).toHaveValue(
    "A question I am still writing",
  );
  await expect(page.getByLabel("A thought to keep")).toHaveValue(
    "My unfinished note",
  );
  expect(
    (await (await request.get("/api/state")).json()).store.sessions[0].status,
  ).toBe("active");
});

test("AI setup enables the real provider immediately and keeps the saved key out of responses", async ({
  page,
  request,
}) => {
  const secret = "sk-e2e-local-only-not-a-real-key";
  await page.goto("/settings#ai");
  await page.getByLabel("OpenAI API key", { exact: true }).fill(secret);
  await page.getByLabel("OpenAI model", { exact: true }).fill("test-model");
  await page
    .getByRole("button", { name: "Save AI setup", exact: true })
    .click();
  await expect(
    page.getByText("AI setup saved locally. Ask is ready without restarting.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("OpenAI API key", { exact: true })).toHaveValue(
    "",
  );
  await page.reload();
  await expect(
    page.getByText("OpenAI configured · test-model", { exact: true }),
  ).toBeVisible();
  const state = await (await request.get("/api/state")).json();
  expect(state.aiMode).toBe("openai");
  expect(JSON.stringify(state)).not.toContain(secret);
  const exported = await (await request.get("/api/export")).json();
  expect(JSON.stringify(exported)).not.toContain(secret);
  // No cloud request is made with this intentionally fake test credential.
});
