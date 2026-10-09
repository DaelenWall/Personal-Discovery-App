import { clamp, type Idea, type ScoreBreakdown, type Store } from "./types";

export function scoreIdea(
  idea: Idea,
  store: Store,
  recent: Idea[] = [],
  focus: string[] = [],
): ScoreBreakdown {
  const state = store.states.find((entry) => entry.ideaId === idea.id);
  const weights = idea.topics.map(
    (topic) => store.settings.topicWeights[topic] ?? 0,
  );
  const interest = clamp(
    0.5 +
      (weights.reduce((sum, n) => sum + n, 0) / Math.max(1, weights.length)) *
        0.4 +
      (idea.topics.some((topic) => focus.includes(topic)) ? 0.1 : 0),
  );
  const familiarity = idea.concepts.map(
    (name) =>
      store.concepts.find((entry) => entry.concept === name)?.familiarity ?? 0,
  );
  const meanFamiliarity =
    familiarity.reduce((sum, n) => sum + n, 0) /
    Math.max(1, familiarity.length);
  const novelty = clamp(1 - meanFamiliarity - (state?.timesSeen ? 0.2 : 0));
  const connection = clamp(
    familiarity.filter((n) => n > 0.2).length / Math.max(1, familiarity.length),
  );
  const repeatedTopics = recent
    .slice(-2)
    .filter((item) =>
      item.topics.some((topic) => idea.topics.includes(topic)),
    ).length;
  const diversity = clamp(1 - repeatedTopics * 0.4);
  const depth = clamp(idea.depthScore);
  const sourceQuality = clamp(idea.sourceQuality);
  const total =
    0.3 * interest +
    0.25 * novelty +
    0.15 * depth +
    0.15 * sourceQuality +
    0.1 * connection +
    0.05 * diversity;
  const strongestTopic = [...idea.topics].sort(
    (a, b) =>
      (store.settings.topicWeights[b] ?? 0) -
      (store.settings.topicWeights[a] ?? 0),
  )[0];
  const reason = [
    interest > 0.55
      ? `Interest in ${strongestTopic?.toLowerCase()}`
      : "A little outside your usual topics",
    novelty > 0.7
      ? "low familiarity"
      : "connects with concepts you have encountered",
    diversity > 0.5 ? "adds variety" : "a related perspective",
  ].join(" · ");
  return {
    interest,
    novelty,
    depth,
    sourceQuality,
    connection,
    diversity,
    total,
    reason,
  };
}

export function createBatch(
  store: Store,
  count: number,
  focus: string[] = [],
  exclude: string[] = [],
) {
  if (!Number.isInteger(count) || count < 1 || count > 30)
    throw new Error("Choose between 1 and 30 ideas.");
  const candidates = store.ideas.filter((idea) => {
    const state = store.states.find((entry) => entry.ideaId === idea.id);
    return (
      !exclude.includes(idea.id) &&
      state?.status !== "known" &&
      state?.status !== "dismissed" &&
      (!focus.length || idea.topics.some((topic) => focus.includes(topic)))
    );
  });
  const selected: Idea[] = [];
  const ranking: Record<string, ScoreBreakdown> = {};
  while (selected.length < count && candidates.length) {
    const scored = candidates
      .map((idea) => ({ idea, score: scoreIdea(idea, store, selected, focus) }))
      .sort(
        (a, b) =>
          b.score.total - a.score.total || a.idea.id.localeCompare(b.idea.id),
      );
    const next = scored[0];
    selected.push(next.idea);
    ranking[next.idea.id] = next.score;
    candidates.splice(
      candidates.findIndex((idea) => idea.id === next.idea.id),
      1,
    );
  }
  return { ideaIds: selected.map((idea) => idea.id), ranking };
}
