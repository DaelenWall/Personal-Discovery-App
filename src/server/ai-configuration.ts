import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const configSchema = z.object({
  apiKey: z.string().trim().min(10).max(512),
  model: z.string().trim().min(1).max(200),
});
export type AIConfiguration = z.infer<typeof configSchema>;
export type AIStatus = {
  configured: boolean;
  hasApiKey: boolean;
  model: string;
  source: "local" | "environment" | "none";
};

export function aiConfigurationPath() {
  return `${process.env.DISCOVERY_DB_PATH || resolve(process.cwd(), "data/discovery.sqlite")}.ai.json`;
}

export function readLocalAIConfiguration(
  path = aiConfigurationPath(),
): AIConfiguration | undefined {
  if (!existsSync(path)) return;
  return configSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

export function saveAIConfiguration(
  config: AIConfiguration,
  path = aiConfigurationPath(),
) {
  const validated = configSchema.parse(config);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(validated), { mode: 0o600 });
  renameSync(temporary, path);
  chmodSync(path, 0o600);
}

export function resolveAIConfiguration(
  environment: { OPENAI_API_KEY?: string; OPENAI_MODEL?: string } = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  },
  local = readLocalAIConfiguration(),
) {
  const apiKey = local?.apiKey || environment.OPENAI_API_KEY?.trim();
  const model = local?.model || environment.OPENAI_MODEL?.trim();
  const status: AIStatus = {
    configured: Boolean(apiKey && model),
    hasApiKey: Boolean(apiKey),
    model: model || "",
    source: local ? "local" : apiKey || model ? "environment" : "none",
  };
  return { apiKey, model, status };
}
