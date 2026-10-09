import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Store } from "../src/domain/types";
import { SqliteRepository } from "../src/server/repository";

const folder = mkdtempSync(join(tmpdir(), "discovery-restart-"));
const base = "http://127.0.0.1:3101";
let server: ChildProcess | undefined;

async function startServer() {
  server = spawn(
    process.execPath,
    [
      resolve("node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3101",
    ],
    {
      env: {
        ...process.env,
        DISCOVERY_DB_PATH: join(folder, "test.sqlite"),
        OPENAI_API_KEY: "",
        OPENAI_MODEL: "",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  let lastError = "";
  server.stderr?.on("data", (chunk) => {
    lastError = String(chunk);
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null)
      throw new Error(`Server stopped during startup: ${lastError}`);
    try {
      const response = await fetch(`${base}/api/state`);
      if (response.ok) return;
    } catch {
      /* wait for the local listener */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not start: ${lastError}`);
}
async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const stopping = server;
  await new Promise<void>((resolve) => {
    stopping.once("exit", () => resolve());
    stopping.kill("SIGTERM");
  });
  server = undefined;
}
async function action(body: unknown): Promise<Store> {
  const response = await fetch(`${base}/api/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result.store;
}

try {
  await startServer();
  let store = await action({
    type: "start",
    contractType: "cards",
    contractValue: 10,
    topicFocus: [],
  });
  const session = store.sessions[0];
  const ideaId = session.ideaIds[0];
  store = await action({
    type: "feedback",
    sessionId: session.id,
    ideaId,
    action: "save",
  });
  store = await action({
    type: "feedback",
    sessionId: session.id,
    ideaId,
    action: "mark_known",
  });
  store = await action({
    type: "note",
    ideaId,
    note: "Retained across a complete server restart.",
  });
  store = await action({ type: "end", sessionId: session.id });
  store = await action({
    type: "start",
    contractType: "time",
    contractValue: 1,
    topicFocus: [],
  });
  const timedId = store.sessions.at(-1)!.id;
  const fixture = new SqliteRepository(join(folder, "test.sqlite"));
  try {
    fixture.update((snapshot) => {
      snapshot.sessions.find((entry) => entry.id === timedId)!.deadline =
        new Date(Date.now() - 1000).toISOString();
      return snapshot;
    });
  } finally {
    fixture.close();
  }
  store = await action({ type: "tick", sessionId: timedId });
  assert.equal(store.sessions.at(-1)!.status, "active");
  store = await action({ type: "dismiss_time_reminder", sessionId: timedId });
  assert.ok(store.sessions.at(-1)!.timeReminderDismissedAt);
  const exported = await (await fetch(`${base}/api/export`)).json();
  assert.deepEqual(exported, store);
  await stopServer();
  await startServer();
  const reopened = await (await fetch(`${base}/api/state`)).json();
  assert.equal(reopened.aiMode, "demo");
  assert.deepEqual(reopened.store, store);
  assert.ok(
    reopened.store.states.some((entry: { saved: boolean }) => entry.saved),
  );
  assert.ok(
    reopened.store.concepts.some(
      (entry: { familiarity: number }) => entry.familiarity >= 0.85,
    ),
  );
  const ended = await action({ type: "advance", sessionId: timedId });
  assert.equal(ended.sessions.at(-1)!.status, "ended");
  assert.equal(ended.sessions.at(-1)!.currentIndex, 0);
  console.log(
    "Production restart verified: saved ideas, notes, knowledge, preferences, history, events, JSON export, and a dismissed deadline reminder persist. Timed reading stays active until Next. No AI key required.",
  );
} finally {
  await stopServer();
  rmSync(folder, { recursive: true, force: true });
}
