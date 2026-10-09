import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  ingestionSchema,
  isDuplicate,
  validateEvidence,
  validateSourceText,
} from "@/domain/ingestion";
import { extractUrl, validatePublicUrl } from "@/server/extraction";
import { aiProvider } from "@/server/ai";
import { drafts, pruneDrafts } from "@/server/drafts";
import { repository } from "@/server/repository";
import { assertLocalRequest, errorResponse, readJson } from "@/server/http";
import type { Idea, Source } from "@/domain/types";

export async function POST(request: Request) {
  try {
    assertLocalRequest(request);
    const body = await readJson(request);
    pruneDrafts();
    if (body.action === "commit") {
      const input = z
        .object({
          draftId: z.string(),
          title: z.string().trim().min(3).max(200),
          topics: z.array(z.string().trim().min(1).max(80)).min(1).max(5),
        })
        .parse(body);
      const draft = drafts.get(input.draftId);
      if (!draft)
        throw new Error(
          "This preview expired or the server restarted. Generate a fresh preview.",
        );
      validateSourceText(draft.source.rawText);
      validateEvidence(draft.source.rawText, draft.idea.evidence);
      const { evidence, ...generated } = draft.idea;
      const idea: Idea = {
        ...generated,
        supportingExcerpt: evidence,
        title: input.title,
        topics: input.topics,
        id: randomUUID(),
        sourceId: draft.source.id,
        createdAt: new Date().toISOString(),
        sourceQuality: 0.6,
        depthScore: draft.idea.interpretation === "ai" ? 0.75 : 0.5,
      };
      if (body.clientOwned === true) {
        return Response.json({ idea, source: draft.source, ideaId: idea.id });
      }
      const store = repository().update((store) => {
        if (isDuplicate(idea, store.ideas))
          throw new Error(
            "This idea is already in your collection or is a near duplicate.",
          );
        store.sources.push(draft.source);
        store.ideas.push(idea);
        for (const topic of idea.topics)
          store.settings.topicWeights[topic] ??= 0;
        return store;
      });
      drafts.delete(input.draftId);
      return Response.json({ store, ideaId: idea.id });
    }
    const input = ingestionSchema.parse(body);
    const extracted =
      input.kind === "url"
        ? await extractUrl(input.url)
        : {
            title: input.title,
            rawText: validateSourceText(input.text),
            url: input.url ? validatePublicUrl(input.url).href : undefined,
            author: input.author || undefined,
          };
    const source: Source = {
      ...extracted,
      id: randomUUID(),
      type: input.kind === "url" ? "url" : "pasted_text",
      createdAt: new Date().toISOString(),
    };
    const provider = aiProvider();
    const idea = await provider.generateIdea(source);
    if (
      body.clientOwned !== true &&
      isDuplicate(idea, repository().read().ideas)
    )
      throw new Error(
        "This idea is already in your collection or is a near duplicate.",
      );
    if (drafts.size >= 50)
      throw new Error(
        "Too many pending previews. Save a preview or try again later.",
      );
    const draftId = randomUUID();
    drafts.set(draftId, { source, idea, expiresAt: Date.now() + 1_800_000 });
    return Response.json({
      draftId,
      source,
      idea,
      mode: provider.mode,
      warning:
        "Verify the explanation against the source. Supporting extract matching does not establish factual correctness.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
