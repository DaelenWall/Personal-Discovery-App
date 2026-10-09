import { clamp, type ConceptState, type Idea, type Settings } from "./types";

export type RecallResult = "got_it" | "partly" | "missed";

export function encounterConcept(
  concept: string,
  previous: ConceptState | undefined,
  now: string,
): ConceptState {
  return {
    concept,
    familiarity: previous?.familiarity ?? 0,
    confidence: previous?.confidence ?? 0,
    successfulRecalls: previous?.successfulRecalls ?? 0,
    failedRecalls: previous?.failedRecalls ?? 0,
    ...previous,
    lastEncounteredAt: now,
  };
}

export function updateRecall(
  previous: ConceptState,
  result: RecallResult,
  now: string,
): ConceptState {
  const correct = result === "got_it";
  return {
    ...previous,
    familiarity: clamp(
      previous.familiarity +
        (correct ? 0.2 : result === "partly" ? 0.08 : -0.1),
    ),
    confidence: clamp(
      previous.confidence +
        (correct ? 0.18 : result === "partly" ? 0.05 : -0.12),
    ),
    lastRecalledAt: now,
    successfulRecalls: previous.successfulRecalls + (correct ? 1 : 0),
    failedRecalls: previous.failedRecalls + (result === "missed" ? 1 : 0),
  };
}

export function evaluateRecall(
  idea: Idea,
  answer: number | string,
): RecallResult {
  if (!idea.recall) return "missed";
  if (typeof answer === "number")
    return answer === idea.recall.answer ? "got_it" : "missed";
  const text = answer.toLowerCase().trim();
  if (text.length < 12) return "missed";
  const matches = idea.recall.keywords.filter((keyword) =>
    text.includes(keyword.toLowerCase()),
  ).length;
  return matches >= 2 ? "got_it" : matches === 1 ? "partly" : "missed";
}

export function applyTopicFeedback(
  settings: Settings,
  topics: string[],
  feedback:
    "save" | "dismiss" | "mark_known" | "more_like_this" | "deep_dive" | "ask",
): Settings {
  const delta = {
    save: 0.06,
    dismiss: -0.06,
    mark_known: 0.01,
    more_like_this: 0.1,
    deep_dive: 0.04,
    ask: 0.04,
  }[feedback];
  const topicWeights = { ...settings.topicWeights };
  for (const topic of topics)
    topicWeights[topic] = clamp((topicWeights[topic] ?? 0) + delta, -1, 1);
  return { ...settings, topicWeights };
}
