import { z } from "zod";
import { createSeedStore } from "../data/seed";
import { commandSchema } from "../domain/commands";
import { applyCommand } from "../domain/engine";
import { DemoProvider } from "../domain/demo-ai";
import {
  ingestionSchema,
  isDuplicate,
  validateEvidence,
  validateSourceText,
} from "../domain/ingestion";
import { validateSnapshot } from "../domain/snapshot";
import type { Idea, Source } from "../domain/types";
import type { AskContext, GeneratedDraft } from "../server/ai";
import {
  readDeviceSnapshot,
  updateDeviceSnapshot,
  type DeviceSnapshot,
} from "./repository";

const defaultStatus = {
  configured: false,
  hasApiKey: false,
  model: "",
  source: "none" as const,
};
const localDrafts = new Map<string, { source: Source; idea: GeneratedDraft }>();
const clock = () => ({
  now: new Date().toISOString(),
  id: () => crypto.randomUUID(),
});

async function network(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "The Mac could not complete this request.");
  return result as Record<string, unknown>;
}

export async function initializeDevice(): Promise<DeviceSnapshot> {
  const existing = await readDeviceSnapshot();
  if (existing) return existing;
  let initial: DeviceSnapshot = {
    store: createSeedStore(),
    aiMode: "demo",
    aiStatus: defaultStatus,
  };
  try {
    const response = await fetch("/api/state", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      initial = {
        store: validateSnapshot(data.store),
        aiMode: data.aiMode,
        aiStatus: data.aiStatus,
      };
    }
  } catch {
    /* The seeded app works even if the private Mac service is unavailable. */
  }
  return updateDeviceSnapshot((previous) => previous ?? initial);
}

export async function refreshDeviceAIStatus() {
  try {
    const response = await fetch("/api/ai-status", {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return;
    const data = await response.json();
    return updateDeviceSnapshot((previous) => ({
      ...previous!,
      aiMode: data.aiMode,
      aiStatus: data.aiStatus,
    }));
  } catch {
    return;
  }
}

export async function requestDevice(
  path: string,
  raw: unknown,
): Promise<Record<string, unknown>> {
  const snapshot = (await readDeviceSnapshot())!;
  const input = raw as Record<string, unknown>;
  if (path === "/api/actions") {
    const command = commandSchema.parse(raw);
    const updated = await updateDeviceSnapshot((previous) => {
      if (
        command.type === "tick" &&
        command.expectedIndex !== undefined &&
        previous!.store.sessions.find(
          (session) => session.id === command.sessionId,
        )?.currentIndex !== command.expectedIndex
      )
        return previous!;
      return {
        ...previous!,
        store: applyCommand(previous!.store, command, clock()),
      };
    });
    return { store: updated.store };
  }
  if (path === "/api/reset") {
    if (input.confirm !== "DELETE MY LOCAL DATA")
      throw new Error("Type DELETE MY LOCAL DATA to confirm.");
    const updated = await updateDeviceSnapshot((previous) => ({
      ...previous!,
      store: createSeedStore(),
    }));
    return { store: updated.store };
  }
  if (path === "/api/device-import") {
    const imported = validateSnapshot(input.store);
    const updated = await updateDeviceSnapshot((previous) => ({
      ...previous!,
      store: imported,
    }));
    return { store: updated.store };
  }
  if (path === "/api/ask") {
    const idea = snapshot.store.ideas.find((idea) => idea.id === input.ideaId);
    if (!idea) throw new Error("Idea not found.");
    const source = snapshot.store.sources.find(
      (source) => source.id === idea.sourceId,
    )!;
    const context: AskContext = {
      idea,
      source,
      related: idea.concepts,
      known:
        snapshot.store.states.find((state) => state.ideaId === idea.id)
          ?.status === "known",
      savedIdeas: snapshot.store.ideas
        .filter(
          (candidate) =>
            snapshot.store.states.find((state) => state.ideaId === candidate.id)
              ?.saved &&
            candidate.concepts.some((concept) =>
              idea.concepts.includes(concept),
            ),
        )
        .slice(0, 3)
        .map((idea) => `${idea.title}: ${idea.oneSentence}`),
      history: (input.history ?? []) as AskContext["history"],
    };
    let result: Record<string, unknown>;
    if (!navigator.onLine)
      result = {
        answer: await new DemoProvider().answer(
          String(input.question),
          context,
        ),
        mode: "demo",
      };
    else {
      try {
        result = await network(path, {
          ...input,
          clientContext: {
            ...context,
            source: { ...source, rawText: source.rawText.slice(0, 16000) },
          },
        });
      } catch (error) {
        if (
          !(error instanceof TypeError) &&
          !(error instanceof DOMException && error.name === "TimeoutError")
        )
          throw error;
        result = {
          answer: `The Mac service is unavailable.\n\n${await new DemoProvider().answer(String(input.question), context)}`,
          mode: "demo",
        };
      }
    }
    const updated = await updateDeviceSnapshot((previous) => ({
      ...previous!,
      store: applyCommand(
        previous!.store,
        {
          type: "feedback",
          ideaId: idea.id,
          sessionId: input.sessionId as string | undefined,
          action: "ask",
        },
        clock(),
      ),
    }));
    return { ...result, store: updated.store };
  }
  if (path === "/api/ingest") {
    if (input.action === "commit") {
      const validated = z
        .object({
          draftId: z.string(),
          title: z.string().trim().min(3).max(200),
          topics: z.array(z.string().trim().min(1).max(80)).min(1).max(5),
        })
        .parse(input);
      const draft = localDrafts.get(validated.draftId);
      let idea: Idea;
      let source: Source;
      if (draft) {
        source = draft.source;
        validateEvidence(source.rawText, draft.idea.evidence);
        const { evidence, ...generated } = draft.idea;
        idea = {
          ...generated,
          title: validated.title,
          topics: validated.topics,
          id: crypto.randomUUID(),
          sourceId: source.id,
          supportingExcerpt: evidence,
          createdAt: new Date().toISOString(),
          sourceQuality: 0.6,
          depthScore: 0.5,
        };
      } else {
        const result = await network(path, { ...input, clientOwned: true });
        idea = result.idea as Idea;
        source = result.source as Source;
      }
      const updated = await updateDeviceSnapshot((previous) => {
        const store = structuredClone(previous!.store);
        if (isDuplicate(idea, store.ideas))
          throw new Error(
            "This idea is already in your collection or is a near duplicate.",
          );
        store.sources.push(source);
        store.ideas.push(idea);
        for (const topic of idea.topics)
          store.settings.topicWeights[topic] ??= 0;
        return { ...previous!, store };
      });
      localDrafts.delete(validated.draftId);
      return { store: updated.store, ideaId: idea.id };
    }
    const validated = ingestionSchema.parse(raw);
    if (navigator.onLine) {
      try {
        return await network(path, { ...input, clientOwned: true });
      } catch (error) {
        if (validated.kind !== "text" || !(error instanceof TypeError))
          throw error;
      }
    }
    if (validated.kind === "url")
      throw new Error(
        "URL extraction needs a connection to your Mac. Paste accessible text to add a source offline.",
      );
    const source: Source = {
      id: crypto.randomUUID(),
      type: "pasted_text",
      title: validated.title,
      rawText: validateSourceText(validated.text),
      url: validated.url || undefined,
      author: validated.author || undefined,
      createdAt: new Date().toISOString(),
    };
    const idea = await new DemoProvider().generateIdea(source);
    if (isDuplicate(idea, snapshot.store.ideas))
      throw new Error("This idea is already in your collection.");
    const draftId = crypto.randomUUID();
    localDrafts.set(draftId, { source, idea });
    return {
      draftId,
      source,
      idea,
      mode: "demo",
      warning:
        "Offline draft preserves a source extract. Review it before saving.",
    };
  }
  if (!navigator.onLine)
    throw new Error("Connect to your Mac to configure or test AI.");
  const result = await network(path, raw);
  if (result.aiStatus)
    await updateDeviceSnapshot((previous) => ({
      ...previous!,
      aiMode: String(result.aiMode),
      aiStatus: result.aiStatus as DeviceSnapshot["aiStatus"],
    }));
  return result;
}
