import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteRepository } from "../src/server/repository";
import { applyCommand } from "../src/domain/engine";

test("SQLite persists saved items, concepts, settings, sessions, and events across reopen", () => {
  const dir = mkdtempSync(join(tmpdir(), "discovery-repo-"));
  const path = join(dir, "test.sqlite");
  let sequence = 0;
  const clock = {
    now: "2026-10-06T12:00:00.000Z",
    id: () => `persist-${++sequence}`,
  };
  const first = new SqliteRepository(path);
  try {
    const start = first.update((store) =>
      applyCommand(
        store,
        {
          type: "start",
          contractType: "cards",
          contractValue: 10,
          topicFocus: [],
        },
        clock,
      ),
    );
    const session = start.sessions[0];
    first.update((store) =>
      applyCommand(
        store,
        {
          type: "feedback",
          sessionId: session.id,
          ideaId: session.ideaIds[0],
          action: "save",
        },
        clock,
      ),
    );
    first.update((store) =>
      applyCommand(
        store,
        {
          type: "feedback",
          sessionId: session.id,
          ideaId: session.ideaIds[0],
          action: "mark_known",
        },
        clock,
      ),
    );
    const before = first.read();
    first.close();
    const second = new SqliteRepository(path);
    try {
      assert.deepEqual(second.read(), before);
    } finally {
      second.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("repository rolls back a failed write and rejects event rewrites", () => {
  const db = new SqliteRepository(":memory:");
  try {
    db.update((store) => {
      store.events.push({
        id: "a",
        sessionId: "library",
        type: "save",
        createdAt: "2026-10-06T00:00:00.000Z",
      });
      return store;
    });
    const before = db.read();
    assert.throws(() =>
      db.update((store) => {
        store.events[0].type = "dismiss";
        return store;
      }),
    );
    assert.deepEqual(db.read(), before);
    assert.throws(() =>
      db.update(() => {
        throw new Error("failure");
      }),
    );
    assert.deepEqual(db.read(), before);
    assert.equal(db.reset().events.length, 0);
    assert.equal(db.read().ideas.length, 25);
  } finally {
    db.close();
  }
});
