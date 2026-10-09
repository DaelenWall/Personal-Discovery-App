import { z } from "zod";
import { randomUUID } from "node:crypto";
import { aiProvider, describeAIError } from "@/server/ai";
import { repository } from "@/server/repository";
import { applyCommand } from "@/domain/engine";
import { assertLocalRequest, errorResponse, readJson } from "@/server/http";
import { ideaSchema, sourceSchema } from "@/domain/snapshot";

const schema = z.object({
  ideaId: z.string(),
  sessionId: z.string().optional(),
  question: z.string().trim().min(3).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .max(6)
    .default([]),
  clientContext: z
    .object({
      idea: ideaSchema,
      source: sourceSchema,
      related: z.array(z.string()).max(100),
      known: z.boolean(),
      savedIdeas: z.array(z.string().max(2000)).max(3),
    })
    .optional(),
});
export async function POST(request: Request) {
  try {
    assertLocalRequest(request);
    const input = schema.parse(await readJson(request));
    const db = repository();
    const before = db.read();
    const idea =
      input.clientContext?.idea ??
      before.ideas.find((entry) => entry.id === input.ideaId);
    if (!idea) throw new Error("Idea not found.");
    const source =
      input.clientContext?.source ??
      before.sources.find((entry) => entry.id === idea.sourceId)!;
    if (idea.id !== input.ideaId || source.id !== idea.sourceId)
      throw new Error("Idea and source context do not match.");
    const provider = aiProvider();
    let answer: string;
    try {
      answer = await provider.answer(input.question, {
        idea,
        source,
        related: input.clientContext?.related ?? idea.concepts,
        known:
          input.clientContext?.known ??
          before.states.find((state) => state.ideaId === idea.id)?.status ===
            "known",
        savedIdeas:
          input.clientContext?.savedIdeas ??
          before.ideas
            .filter(
              (entry) =>
                before.states.find((state) => state.ideaId === entry.id)
                  ?.saved &&
                entry.concepts.some((concept) =>
                  idea.concepts.includes(concept),
                ),
            )
            .slice(0, 3)
            .map((entry) => `${entry.title}: ${entry.oneSentence}`),
        history: input.history,
      });
    } catch (error) {
      return Response.json({ error: describeAIError(error) }, { status: 502 });
    }
    if (input.clientContext)
      return Response.json({ answer, mode: provider.mode });
    const store = db.update((previous) =>
      applyCommand(
        previous,
        {
          type: "feedback",
          sessionId: input.sessionId,
          ideaId: idea.id,
          action: "ask",
        },
        { now: new Date().toISOString(), id: randomUUID },
      ),
    );
    return Response.json({ answer, mode: provider.mode, store });
  } catch (error) {
    return errorResponse(error);
  }
}
