import { test as base, expect } from "@playwright/test";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

type BetaServer = {
  start(): Promise<void>;
  stop(): Promise<void>;
  code(): string;
};

export const test = base.extend<
  Record<never, never>,
  { betaServer: BetaServer }
>({
  betaServer: [
    async ({ browserName }, use, workerInfo) => {
      const directory = join(
        String(workerInfo.config.metadata.directory),
        `${browserName}-${workerInfo.workerIndex}`,
      );
      const env = {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        DISCOVERY_BETA_DIR: directory,
        DISCOVERY_BETA_HOST: "127.0.0.1",
        DISCOVERY_BETA_BIND: "127.0.0.1",
        DISCOVERY_BETA_PORT: "3443",
        DISCOVERY_DB_PATH: join(directory, "test.sqlite"),
        OPENAI_API_KEY: "",
        OPENAI_MODEL: "",
      };
      await promisify(execFile)(
        process.execPath,
        ["--import", "tsx", "scripts/beta-prepare.ts"],
        { env },
      );
      let child: ChildProcess | undefined;
      const betaServer: BetaServer = {
        async start() {
          if (child) return;
          child = spawn(
            process.execPath,
            ["--import", "tsx", "scripts/beta-server.ts"],
            { env, stdio: ["ignore", "pipe", "pipe"] },
          );
          await new Promise<void>((resolve, reject) => {
            let output = "";
            const timer = setTimeout(
              () => reject(new Error(`Beta service did not start: ${output}`)),
              30000,
            );
            child!.stdout!.on("data", (part) => {
              output += part.toString();
              if (output.includes("PRIVATE_BETA_READY")) {
                clearTimeout(timer);
                resolve();
              }
            });
            child!.stderr!.on("data", (part) => {
              output += part.toString();
            });
            child!.once("error", (error) => {
              clearTimeout(timer);
              reject(error);
            });
            child!.once("exit", (code) => {
              clearTimeout(timer);
              reject(new Error(`Beta service exited (${code}): ${output}`));
            });
          });
        },
        async stop() {
          const running = child;
          child = undefined;
          if (!running || running.exitCode !== null) return;
          await new Promise<void>((resolve) => {
            const timer = setTimeout(() => running.kill("SIGKILL"), 5000);
            running.once("exit", () => {
              clearTimeout(timer);
              resolve();
            });
            running.kill("SIGTERM");
          });
        },
        code() {
          return JSON.parse(
            readFileSync(join(directory, "pairing.json"), "utf8"),
          ).code;
        },
      };
      try {
        await use(betaServer);
      } finally {
        await betaServer.stop();
      }
    },
    { scope: "worker" },
  ],
});
export { expect };
