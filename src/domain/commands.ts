import { z } from "zod";

const sessionFields = {
  sessionId: z.string().min(1),
  activeSeconds: z.number().min(0).max(3600).optional(),
  expectedIndex: z.number().int().nonnegative().optional(),
};
export const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start"),
    contractType: z.enum(["time", "cards"]),
    contractValue: z.number().int().min(1).max(60),
    topicFocus: z.array(z.string().min(1).max(80)).max(10).default([]),
  }),
  z.object({ type: z.literal("tick"), ...sessionFields }),
  z.object({ type: z.literal("advance"), ...sessionFields }),
  z.object({ type: z.literal("end"), ...sessionFields }),
  z.object({ type: z.literal("dismiss_time_reminder"), ...sessionFields }),
  z.object({
    type: z.literal("extend"),
    ...sessionFields,
    mode: z.enum(["time", "cards"]),
  }),
  z.object({
    type: z.literal("feedback"),
    ideaId: z.string().min(1),
    action: z.enum([
      "save",
      "dismiss",
      "mark_known",
      "more_like_this",
      "deep_dive",
      "source_open",
      "ask",
    ]),
    sessionId: z.string().optional(),
    activeSeconds: z.number().min(0).max(3600).optional(),
    expectedIndex: z.number().int().nonnegative().optional(),
  }),
  z.object({
    type: z.literal("recall"),
    ...sessionFields,
    answer: z
      .union([z.number().int().min(-1).max(10), z.string().max(2000)])
      .optional(),
    skip: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("note"),
    ideaId: z.string(),
    note: z.string().max(10000),
  }),
  z.object({
    type: z.literal("settings"),
    defaultMinutes: z.number().int().min(1).max(60),
    enoughSensitivity: z.enum(["conservative", "balanced"]),
    topicWeights: z
      .record(z.string().min(1).max(80), z.number().min(-1).max(1))
      .refine((v) => Object.keys(v).length <= 100),
    theme: z.enum(["light", "dark", "system"]),
  }),
]);
export type Command = z.infer<typeof commandSchema>;
