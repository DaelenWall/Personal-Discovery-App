import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createSeedStore } from "../data/seed";
import type { Store } from "../domain/types";

export interface Repository {
  read(): Store;
  update(change: (store: Store) => Store): Store;
  reset(): Store;
  close(): void;
}

const collections = [
  "sources",
  "ideas",
  "states",
  "concepts",
  "sessions",
  "events",
] as const;
const keyFor = (
  table: (typeof collections)[number],
  item: Record<string, unknown>,
) =>
  String(
    table === "states"
      ? item.ideaId
      : table === "concepts"
        ? item.concept
        : item.id,
  );

export class SqliteRepository implements Repository {
  private database: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:")
      mkdirSync(dirname(resolve(path)), { recursive: true });
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
    for (const table of collections)
      this.database.exec(
        `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, payload TEXT NOT NULL)`,
      );
    this.database.exec(
      "CREATE TABLE IF NOT EXISTS config (id TEXT PRIMARY KEY, payload TEXT NOT NULL)",
    );
    const row = this.database
      .prepare("SELECT payload FROM config WHERE id = 'schema'")
      .get();
    if (!row) this.update(() => createSeedStore());
    else if (JSON.parse(String(row.payload)) !== 1)
      throw new Error(
        "Unsupported database version. Export your data before upgrading.",
      );
  }
  read(): Store {
    const base = { schemaVersion: 1 } as Store;
    for (const table of collections) {
      const items = this.database
        .prepare(`SELECT payload FROM ${table} ORDER BY rowid`)
        .all()
        .map((row) => JSON.parse(String(row.payload)));
      Object.assign(base, { [table]: items });
    }
    const config = this.database
      .prepare("SELECT payload FROM config WHERE id = 'settings'")
      .get();
    base.settings = config
      ? JSON.parse(String(config.payload))
      : createSeedStore().settings;
    return base;
  }
  update(change: (store: Store) => Store): Store {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const previous = this.read();
      const historicalEvents = previous.events.map((entry) =>
        JSON.stringify(entry),
      );
      const next = change(previous);
      // Events are insert-only. A failed reducer cannot rewrite historical evidence.
      if (
        next.events.length < historicalEvents.length ||
        historicalEvents.some(
          (entry, index) => entry !== JSON.stringify(next.events[index]),
        )
      )
        throw new Error("Interaction events must remain append-only.");
      if (
        new Set(next.events.map((entry) => entry.id)).size !==
        next.events.length
      )
        throw new Error("Interaction event IDs must be unique.");
      this.write(next);
      this.database.exec("COMMIT");
      return next;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
  private write(next: Store) {
    for (const table of collections) {
      const insert = this.database.prepare(
        `INSERT INTO ${table} (id, payload) VALUES (?, ?) ${table === "events" ? "ON CONFLICT(id) DO NOTHING" : "ON CONFLICT(id) DO UPDATE SET payload = excluded.payload"}`,
      );
      for (const item of next[table])
        insert.run(
          keyFor(table, item as unknown as Record<string, unknown>),
          JSON.stringify(item),
        );
    }
    const settings = this.database.prepare(
      "INSERT INTO config (id, payload) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
    );
    settings.run("settings", JSON.stringify(next.settings));
    settings.run("schema", "1");
  }
  reset(): Store {
    const next = createSeedStore();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      for (const table of collections)
        this.database.exec(`DELETE FROM ${table}`);
      this.database.exec("DELETE FROM config");
      this.write(next);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
    return next;
  }
  close() {
    this.database.close();
  }
}

let singleton: SqliteRepository | undefined;
export function repository(): Repository {
  singleton ??= new SqliteRepository(
    process.env.DISCOVERY_DB_PATH ||
      resolve(process.cwd(), "data/discovery.sqlite"),
  );
  return singleton;
}
