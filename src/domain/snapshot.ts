import { z } from "zod";
import type { Store } from "./types";

const id = z.string().min(1).max(200);
const date = z.iso.datetime({ offset: true });
const text = z.string().max(100000);
const fraction = z.number().min(0).max(1);
const strings = z.array(z.string().min(1).max(200)).max(100);
export const sourceSchema = z.object({
  id,
  type: z.enum(["url", "pasted_text", "seed"]),
  title: z.string().min(1).max(500),
  url: z
    .url()
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol))
    .optional(),
  author: z.string().optional(),
  publisher: z.string().optional(),
  publishedAt: z.string().optional(),
  rawText: text,
  createdAt: date,
});
export const ideaSchema = z.object({
  id,
  sourceId: id,
  title: z.string().min(1).max(500),
  oneSentence: text,
  shortExplanation: text,
  deeperExplanation: text.optional(),
  whyItMatters: text.optional(),
  example: text.optional(),
  counterpoint: text.optional(),
  concepts: strings,
  topics: strings,
  sourceQuality: fraction,
  depthScore: fraction,
  createdAt: date,
  interpretation: z.enum(["editorial", "source_extract", "ai"]),
  supportingExcerpt: text.optional(),
  recall: z
    .object({
      question: text,
      options: z.array(text).min(2).max(10),
      answer: z.number().int().min(0).max(9),
      keywords: strings,
    })
    .optional(),
});
const score = z.object({
  interest: fraction,
  novelty: fraction,
  depth: fraction,
  sourceQuality: fraction,
  connection: fraction,
  diversity: fraction,
  total: fraction,
  reason: text,
});
const schema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(sourceSchema).max(10000),
  ideas: z.array(ideaSchema).max(10000),
  states: z
    .array(
      z.object({
        ideaId: id,
        status: z.enum([
          "unseen",
          "seen",
          "saved",
          "known",
          "dismissed",
          "learning",
        ]),
        saved: z.boolean().optional(),
        interestScore: z.number().optional(),
        userNote: text.optional(),
        firstSeenAt: date.optional(),
        lastSeenAt: date.optional(),
        timesSeen: z.number().int().nonnegative(),
      }),
    )
    .max(10000),
  concepts: z
    .array(
      z.object({
        concept: id,
        familiarity: fraction,
        confidence: fraction,
        lastEncounteredAt: date.optional(),
        lastRecalledAt: date.optional(),
        successfulRecalls: z.number().int().nonnegative(),
        failedRecalls: z.number().int().nonnegative(),
      }),
    )
    .max(20000),
  sessions: z
    .array(
      z.object({
        id,
        startedAt: date,
        segmentStartedAt: date.optional(),
        segmentStartIndex: z.number().int().nonnegative().optional(),
        endedAt: date.optional(),
        contractType: z.enum(["time", "cards"]),
        contractValue: z.number().int().min(1).max(60),
        topicFocus: strings,
        extensionCount: z.number().int().nonnegative(),
        enoughTriggered: z.boolean(),
        status: z.enum(["active", "enough", "ended"]),
        endReason: z.enum(["contract", "batch", "manual", "enough"]).optional(),
        ideaIds: z.array(id),
        currentIndex: z.number().int().nonnegative(),
        currentDwellSeconds: z.number().nonnegative(),
        lastActivityAt: date,
        deadline: date.optional(),
        timeBudgetExpiredAt: date.optional(),
        timeReminderDismissedAt: date.optional(),
        cardLimit: z.number().int().nonnegative(),
        enoughWindowStart: date,
        recallIdeaId: id.optional(),
        recallCompleted: z.boolean().optional(),
        recallOffered: z.boolean(),
        ranking: z.record(id, score),
      }),
    )
    .max(10000),
  events: z
    .array(
      z.object({
        id,
        sessionId: id,
        ideaId: id.optional(),
        type: z.enum([
          "card_view",
          "save",
          "dismiss",
          "mark_known",
          "more_like_this",
          "deep_dive",
          "source_open",
          "ask",
          "recall_shown",
          "recall_answered",
          "session_extend",
          "session_end",
          "enough_triggered",
          "time_budget_reached",
          "time_reminder_dismissed",
        ]),
        createdAt: date,
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .max(100000),
  settings: z.object({
    defaultMinutes: z.number().int().min(1).max(60),
    enoughSensitivity: z.enum(["conservative", "balanced"]),
    topicWeights: z.record(z.string().max(80), z.number().min(-1).max(1)),
    theme: z.enum(["system", "light", "dark"]),
  }),
});

export function validateSnapshot(input: unknown): Store {
  const store = schema.parse(input);
  const unique = (values: string[]) => {
    if (new Set(values).size !== values.length)
      throw new Error("Backup contains duplicate IDs.");
  };
  for (const values of [
    store.sources.map((source) => source.id),
    store.ideas.map((idea) => idea.id),
    store.states.map((state) => state.ideaId),
    store.concepts.map((concept) => concept.concept),
    store.sessions.map((session) => session.id),
    store.events.map((event) => event.id),
  ])
    unique(values);
  const ideaIds = new Set(store.ideas.map((idea) => idea.id));
  const sourceIds = new Set(store.sources.map((source) => source.id));
  const sessionIds = new Set(store.sessions.map((session) => session.id));
  if (
    store.ideas.some((idea) => !sourceIds.has(idea.sourceId)) ||
    store.states.some((state) => !ideaIds.has(state.ideaId)) ||
    store.events.some(
      (event) =>
        (event.ideaId && !ideaIds.has(event.ideaId)) ||
        (event.sessionId !== "library" && !sessionIds.has(event.sessionId)),
    )
  )
    throw new Error(
      "Backup contains missing source, idea, or session references.",
    );
  if (
    store.sessions.some(
      (session) =>
        session.ideaIds.some((id) => !ideaIds.has(id)) ||
        session.currentIndex > session.ideaIds.length ||
        (session.contractType === "time" && !session.deadline) ||
        (session.recallIdeaId && !ideaIds.has(session.recallIdeaId)),
    ) ||
    store.sessions.filter((session) => session.status !== "ended").length > 1
  )
    throw new Error("Backup contains an invalid session boundary.");
  if (
    store.ideas.some(
      (idea) => idea.recall && idea.recall.answer >= idea.recall.options.length,
    )
  )
    throw new Error("Backup contains an invalid recall answer.");
  return store;
}
