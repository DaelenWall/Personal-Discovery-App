import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import OpenAI from "openai";
import { createSeedStore } from "../src/data/seed";
import { OpenAIProvider, describeAIError } from "../src/server/ai";
import {
  readLocalAIConfiguration,
  resolveAIConfiguration,
  saveAIConfiguration,
} from "../src/server/ai-configuration";

test("local AI setup persists in a protected file, with a secret-free public status", () => {
  const directory = mkdtempSync(join(tmpdir(), "discovery-ai-"));
  const path = join(directory, "test.sqlite.ai.json");
  const secret = "sk-test-local-only-not-a-real-key";
  try {
    saveAIConfiguration({ apiKey: secret, model: "test-model" }, path);
    const local = readLocalAIConfiguration(path)!;
    assert.equal(local.apiKey, secret);
    assert.equal(statSync(path).mode & 0o777, 0o600);
    const config = resolveAIConfiguration({}, local);
    assert.equal(config.status.configured, true);
    assert.equal(config.status.source, "local");
    assert.equal(JSON.stringify(config.status).includes(secret), false);
    assert.ok(readFileSync(path, "utf8").includes(secret));
    assert.throws(() =>
      saveAIConfiguration({ apiKey: "short", model: "" }, path),
    );
    assert.equal(readLocalAIConfiguration(path)!.apiKey, secret);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("provider configuration distinguishes missing keys and models, and honors local setup", () => {
  // Explicit local values keep these tests independent of personal configuration.
  const empty = { apiKey: "", model: "" };
  assert.equal(resolveAIConfiguration({}, empty).status.configured, false);
  assert.equal(
    resolveAIConfiguration({ OPENAI_API_KEY: "test-key" }, empty).status
      .hasApiKey,
    true,
  );
  assert.equal(
    resolveAIConfiguration({ OPENAI_API_KEY: "test-key" }, empty).status
      .configured,
    false,
  );
  assert.equal(
    resolveAIConfiguration(
      { OPENAI_API_KEY: "test-key", OPENAI_MODEL: "environment-model" },
      empty,
    ).status.configured,
    true,
  );
  assert.equal(
    resolveAIConfiguration(
      { OPENAI_API_KEY: "env-key", OPENAI_MODEL: "env-model" },
      { apiKey: "local-key", model: "local-model" },
    ).model,
    "local-model",
  );
});

test("real Ask provider sends bounded source context and conversation through the official SDK", async () => {
  let payload: Record<string, unknown> | undefined;
  const client = new OpenAI({
    apiKey: "sk-test-transport-only",
    maxRetries: 0,
    fetch: async (_url, init) => {
      payload = JSON.parse(String(init?.body));
      return Response.json({
        id: "resp_test",
        object: "response",
        created_at: 1,
        model: "test-model",
        status: "completed",
        output: [
          {
            id: "msg_test",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [
              {
                type: "output_text",
                text: "Here is a new, grounded follow-up answer.",
                annotations: [],
              },
            ],
          },
        ],
      });
    },
  });
  const store = createSeedStore();
  const answer = await new OpenAIProvider("test-model", client).answer(
    "How does this differ from another proxy?",
    {
      idea: store.ideas[0],
      source: { ...store.sources[0], rawText: "a".repeat(20000) },
      related: ["Feedback loops"],
      known: true,
      savedIdeas: ["A related saved idea"],
      history: [
        { role: "user", content: "Earlier question" },
        { role: "assistant", content: "Earlier answer" },
      ],
    },
  );
  assert.equal(answer, "Here is a new, grounded follow-up answer.");
  assert.equal(payload!.model, "test-model");
  assert.equal(payload!.store, false);
  const input = payload!.input as { role: string; content: string }[];
  const context = JSON.parse(input[0].content);
  assert.equal(context.source.text.length, 16000);
  assert.equal(context.markedKnown, true);
  assert.equal(
    input.at(-1)!.content,
    "How does this differ from another proxy?",
  );
  assert.equal(input[1].content, "Earlier question");
  assert.equal(
    JSON.stringify(payload).includes("sk-test-transport-only"),
    false,
  );
});

test("AI errors are actionable without reflecting provider credentials", () => {
  const secret = "sk-private-test-secret";
  const error = OpenAI.APIError.generate(
    401,
    { error: { message: `Incorrect API key ${secret}` } },
    "",
    new Headers(),
  );
  const message = describeAIError(error);
  assert.ok(message.includes("Update it in Settings"));
  assert.equal(message.includes(secret), false);
  assert.ok(
    describeAIError(
      new OpenAI.APIConnectionError({ message: secret }),
    ).includes("connect to OpenAI"),
  );
});
