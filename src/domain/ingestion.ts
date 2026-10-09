import { z } from "zod";
import type { Idea } from "./types";

export const ingestionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    title: z.string().trim().min(3).max(200),
    text: z.string().trim().min(120).max(100_000),
    url: z.union([z.literal(""), z.url()]).optional(),
    author: z.string().max(200).optional(),
  }),
  z.object({ kind: z.literal("url"), url: z.url().max(2000) }),
]);

export function validateSourceText(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length < 120 || clean.split(/\s+/).length < 30)
    throw new Error("Use at least 30 words of substantive source text.");
  if (clean.length > 100_000)
    throw new Error("Use a source shorter than 100,000 characters.");
  if (
    /^(access denied|just a moment|please sign in|subscribe to continue)/i.test(
      clean,
    )
  )
    throw new Error(
      "This source requires access. Paste text you can legitimately read instead.",
    );
  if (
    /believe in yourself|unlock your potential|dream big and never give up/i.test(
      clean,
    ) &&
    clean.split(/\s+/).length < 100
  )
    throw new Error(
      "This looks like generic motivational content. Choose a source with an explanation or mechanism.",
    );
  return clean;
}

export const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
export function textSimilarity(a: string, b: string) {
  const left = new Set(
    normalizeText(a)
      .split(" ")
      .filter((word) => word.length > 2),
  );
  const right = new Set(
    normalizeText(b)
      .split(" ")
      .filter((word) => word.length > 2),
  );
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((word) => right.has(word)).length;
  return overlap / new Set([...left, ...right]).size;
}
export function isDuplicate(
  candidate: Pick<Idea, "title" | "oneSentence">,
  ideas: Idea[],
) {
  return ideas.some(
    (idea) =>
      normalizeText(idea.title) === normalizeText(candidate.title) ||
      textSimilarity(idea.oneSentence, candidate.oneSentence) >= 0.85,
  );
}

export function validateEvidence(text: string, evidence: string) {
  if (
    evidence.trim().length < 30 ||
    !normalizeText(text).includes(normalizeText(evidence))
  )
    throw new Error(
      "The draft did not include a verifiable supporting extract. Try another source.",
    );
}
