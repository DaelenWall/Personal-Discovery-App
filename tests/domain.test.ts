import assert from "node:assert/strict";
import { test } from "node:test";
import { createSeedStore } from "../src/data/seed";
import { createBatch, scoreIdea } from "../src/domain/ranking";
import { applyCommand } from "../src/domain/engine";
import {
  contractComplete,
  contractProgress,
  summarizeSession,
} from "../src/domain/contracts";
import { evaluateEnough } from "../src/domain/enough";
import {
  applyTopicFeedback,
  encounterConcept,
  updateRecall,
} from "../src/domain/learning";
import { commandSchema, type Command } from "../src/domain/commands";
import type { InteractionEvent, Store } from "../src/domain/types";

const beginning = "2026-10-06T12:00:00.000Z";
const at = (seconds: number) =>
  new Date(Date.parse(beginning) + seconds * 1000).toISOString();
let sequence = 0;
const run = (store: Store, command: Command, seconds = 0) =>
  applyCommand(store, command, {
    now: at(seconds),
    id: () => `test-${++sequence}`,
  });
function start(count = 10, mode: "time" | "cards" = "cards") {
  return run(createSeedStore(), {
    type: "start",
    contractType: mode,
    contractValue: count,
    topicFocus: [],
  });
}
function views(durations: number[], meaningful = false): InteractionEvent[] {
  const result: InteractionEvent[] = [];
  let seconds = 0;
  durations.forEach((dwell, index) => {
    seconds += dwell;
    if (meaningful && index % 3 === 0)
      result.push({
        id: `s-${index}`,
        sessionId: "session",
        ideaId: `idea-${index}`,
        type: "save",
        createdAt: at(seconds - 1),
      });
    result.push({
      id: `v-${index}`,
      sessionId: "session",
      ideaId: `idea-${index}`,
      type: "card_view",
      createdAt: at(seconds),
      metadata: { dwellSeconds: dwell },
    });
  });
  return result;
}

test("seed content has 25 attributed, substantial, original ideas", () => {
  const store = createSeedStore();
  assert.equal(store.ideas.length, 25);
  for (const idea of store.ideas) {
    assert.ok(store.sources.find((source) => source.id === idea.sourceId)?.url);
    assert.ok(idea.shortExplanation.split(/\s+/).length >= 60, idea.title);
    assert.equal(idea.recall?.options[idea.recall.answer], idea.oneSentence);
  }
});
test("ranking is inspectable, weighted, and independent of dwell", () => {
  const store = createSeedStore();
  const idea = store.ideas[0];
  const score = scoreIdea(idea, store);
  assert.equal(
    score.total,
    0.3 * score.interest +
      0.25 * score.novelty +
      0.15 * score.depth +
      0.15 * score.sourceQuality +
      0.1 * score.connection +
      0.05 * score.diversity,
  );
  store.events = views(Array(12).fill(2));
  assert.deepEqual(scoreIdea(idea, store), score);
  store.settings.topicWeights.Economics = 1;
  assert.ok(scoreIdea(idea, store).interest > score.interest);
});
test("known concepts lower novelty; consecutive similar topics lower diversity", () => {
  const store = createSeedStore();
  const idea = store.ideas[0];
  const before = scoreIdea(idea, store);
  store.concepts = idea.concepts.map((name) => ({
    ...encounterConcept(name, undefined, beginning),
    familiarity: 0.9,
  }));
  const after = scoreIdea(idea, store, [idea, idea]);
  assert.ok(after.novelty < before.novelty);
  assert.ok(after.connection > before.connection);
  assert.ok(after.diversity < before.diversity);
});
test("batch is finite, deterministic, unique and excludes known/dismissed ideas", () => {
  const store = createSeedStore();
  store.states = [
    { ideaId: "idea-1", status: "known", timesSeen: 1 },
    { ideaId: "idea-2", status: "dismissed", timesSeen: 1 },
  ];
  const batch = createBatch(store, 10);
  assert.equal(batch.ideaIds.length, 10);
  assert.equal(new Set(batch.ideaIds).size, 10);
  assert.ok(
    !batch.ideaIds.includes("idea-1") && !batch.ideaIds.includes("idea-2"),
  );
  assert.deepEqual(createBatch(store, 10), batch);
  assert.throws(() => createBatch(store, 0));
});
test("opening a second contract resumes rather than rerolls an active batch", () => {
  const store = start();
  const next = run(
    store,
    { type: "start", contractType: "time", contractValue: 20, topicFocus: [] },
    10,
  );
  assert.equal(next.sessions.length, 1);
  assert.deepEqual(next.sessions[0].ideaIds, store.sessions[0].ideaIds);
});
test("card contract ends at boundary without silently adding content", () => {
  let store = start(5);
  const sessionId = store.sessions[0].id;
  const fixed = [...store.sessions[0].ideaIds];
  for (let index = 0; index < 5; index++)
    store = run(
      store,
      { type: "advance", sessionId, activeSeconds: 20 },
      (index + 1) * 20,
    );
  assert.equal(store.sessions[0].status, "ended");
  assert.ok(contractComplete(store.sessions[0], at(100)));
  assert.deepEqual(store.sessions[0].ideaIds, fixed);
  assert.equal(
    store.events.filter((event) => event.type === "card_view").length,
    5,
  );
  const after = run(store, { type: "advance", sessionId }, 110);
  assert.equal(after.events.length, store.events.length);
});
test("elapsed time records a reminder and leaves the current idea active", () => {
  const store = start(10, "time");
  const sessionId = store.sessions[0].id;
  const next = run(store, { type: "tick", sessionId, activeSeconds: 0 }, 601);
  assert.equal(next.sessions[0].status, "active");
  assert.equal(next.sessions[0].currentIndex, 0);
  assert.equal(next.events[0].type, "time_budget_reached");
  assert.equal(
    next.events.filter((event) => event.type === "session_end").length,
    0,
  );
  const later = run(next, { type: "tick", sessionId, activeSeconds: 0 }, 602);
  assert.equal(
    later.events.filter((event) => event.type === "time_budget_reached").length,
    1,
  );
});
test("dwell remains capped by elapsed time and includes reading after the deadline", () => {
  const store = start(1, "time");
  const next = run(
    store,
    { type: "tick", sessionId: store.sessions[0].id, activeSeconds: 999 },
    70,
  );
  assert.equal(next.sessions[0].currentDwellSeconds, 70);
  const ended = run(
    next,
    { type: "advance", sessionId: store.sessions[0].id, activeSeconds: 5 },
    75,
  );
  assert.equal(ended.sessions[0].status, "ended");
  assert.equal(ended.sessions[0].currentIndex, 0);
  assert.equal(
    ended.events.find((event) => event.type === "card_view")?.metadata
      ?.dwellSeconds,
    75,
  );
  assert.equal(ended.states.length, 1);
});
test("after a deadline, save, Ask, source opens and depth do not end the idea", () => {
  let store = start(1, "time");
  const sessionId = store.sessions[0].id;
  const ideaId = store.sessions[0].ideaIds[0];
  for (const action of [
    "save",
    "ask",
    "source_open",
    "deep_dive",
    "mark_known",
  ] as const) {
    store = run(store, { type: "feedback", sessionId, ideaId, action }, 65);
    assert.equal(store.sessions[0].status, "active");
  }
  store = run(store, { type: "advance", sessionId }, 70);
  assert.equal(store.sessions[0].endReason, "contract");
  assert.equal(store.sessions[0].currentIndex, 0);
});
test("dismissed time reminders persist and reset only on an explicit extension", () => {
  let store = start(1, "time");
  const sessionId = store.sessions[0].id;
  store = run(store, { type: "dismiss_time_reminder", sessionId }, 65);
  assert.equal(store.sessions[0].timeReminderDismissedAt, at(65));
  store = run(store, { type: "tick", sessionId }, 70);
  assert.equal(store.sessions[0].timeReminderDismissedAt, at(65));
  store = run(store, { type: "advance", sessionId }, 75);
  store = run(store, { type: "extend", sessionId, mode: "time" }, 80);
  assert.equal(store.sessions[0].timeReminderDismissedAt, undefined);
  assert.equal(store.sessions[0].timeBudgetExpiredAt, undefined);
});
test("recall can finish after the deadline without revealing the queued idea", () => {
  let store = start(1, "time");
  const sessionId = store.sessions[0].id;
  for (let index = 0; index < 5; index++) {
    store = run(
      store,
      {
        type: "feedback",
        sessionId,
        ideaId: store.sessions[0].ideaIds[store.sessions[0].currentIndex],
        action: "save",
      },
      index * 5 + 1,
    );
    store = run(store, { type: "advance", sessionId }, index * 5 + 2);
  }
  assert.ok(store.sessions[0].recallIdeaId);
  const queuedIdea = store.sessions[0].ideaIds[5];
  const recalled = store.ideas.find(
    (idea) => idea.id === store.sessions[0].recallIdeaId,
  )!;
  store = run(
    store,
    { type: "recall", sessionId, answer: recalled.recall!.answer },
    65,
  );
  assert.equal(store.sessions[0].status, "active");
  assert.equal(store.sessions[0].recallCompleted, true);
  assert.equal(
    store.states.some((state) => state.ideaId === queuedIdea),
    false,
  );
  store = run(store, { type: "advance", sessionId }, 70);
  assert.equal(store.sessions[0].status, "ended");
  assert.equal(
    store.events.filter((event) => event.type === "card_view").length,
    5,
  );
});
test("Enough triggers for ten rapid passive views", () => {
  const result = evaluateEnough(views(Array(10).fill(2)), at(20), beginning);
  assert.equal(result.triggered, true);
  assert.equal(result.reason, "rapid_skim");
  assert.equal(result.fastViews, 10);
});
test("Enough does not trigger for deliberate reading or short bursts with meaningful actions", () => {
  assert.equal(
    evaluateEnough(views(Array(15).fill(45), true), at(675), beginning)
      .triggered,
    false,
  );
  assert.equal(
    evaluateEnough(views(Array(12).fill(2), true), at(24), beginning).triggered,
    false,
  );
  assert.equal(
    evaluateEnough(views(Array(7).fill(2)), at(14), beginning).triggered,
    false,
  );
});
test("Enough pauses the feed; only explicit extension resumes and records a boundary", () => {
  let store = start(15);
  const sessionId = store.sessions[0].id;
  for (let index = 0; index < 10; index++)
    store = run(
      store,
      { type: "advance", sessionId, activeSeconds: 2 },
      (index + 1) * 2,
    );
  assert.equal(store.sessions[0].status, "enough");
  const index = store.sessions[0].currentIndex;
  store = run(store, { type: "advance", sessionId }, 21);
  assert.equal(store.sessions[0].currentIndex, index);
  store = run(store, { type: "extend", sessionId, mode: "time" }, 22);
  assert.equal(store.sessions[0].status, "active");
  assert.equal(store.sessions[0].extensionCount, 1);
  assert.equal(store.sessions[0].deadline, at(322));
  assert.equal(contractProgress(store.sessions[0], at(22)), 0);
  assert.equal(store.events.at(-1)?.type, "session_extend");
});
test("save is idempotent, marking known retains save, feedback updates topics slowly", () => {
  let store = start();
  const session = store.sessions[0];
  const ideaId = session.ideaIds[0];
  store = run(
    store,
    { type: "feedback", sessionId: session.id, ideaId, action: "save" },
    10,
  );
  const afterSave = structuredClone(store.settings);
  store = run(
    store,
    { type: "feedback", sessionId: session.id, ideaId, action: "save" },
    11,
  );
  assert.deepEqual(store.settings, afterSave);
  store = run(
    store,
    { type: "feedback", sessionId: session.id, ideaId, action: "mark_known" },
    12,
  );
  const state = store.states.find((entry) => entry.ideaId === ideaId)!;
  assert.equal(state.saved, true);
  assert.equal(state.status, "known");
  assert.ok(store.concepts.some((entry) => entry.familiarity >= 0.85));
  const settings = createSeedStore().settings;
  assert.ok(
    applyTopicFeedback(settings, ["Science"], "save").topicWeights.Science > 0,
  );
  assert.ok(
    applyTopicFeedback(settings, ["Science"], "dismiss").topicWeights.Science <
      0,
  );
});
test("recall appears after five substantive cards and updates familiarity", () => {
  let store = start(10);
  const sessionId = store.sessions[0].id;
  for (let index = 0; index < 5; index++)
    store = run(
      store,
      { type: "advance", sessionId, activeSeconds: 30 },
      (index + 1) * 30,
    );
  assert.ok(store.sessions[0].recallIdeaId);
  const idea = store.ideas.find(
    (entry) => entry.id === store.sessions[0].recallIdeaId,
  )!;
  store = run(
    store,
    { type: "recall", sessionId, answer: idea.recall!.answer },
    160,
  );
  assert.equal(store.sessions[0].recallIdeaId, undefined);
  assert.equal(store.events.at(-1)?.metadata?.result, "got_it");
  assert.ok(
    store.concepts.find((entry) => entry.concept === idea.concepts[0])!
      .successfulRecalls > 0,
  );
  assert.equal(store.sessions[0].currentIndex, 5);
});
test("successful and missed recalls move familiarity in the expected direction and remain bounded", () => {
  const original = {
    ...encounterConcept("Bayesian updating", undefined, beginning),
    familiarity: 0.5,
    confidence: 0.5,
  };
  assert.ok(
    updateRecall(original, "got_it", at(1)).familiarity > original.familiarity,
  );
  assert.ok(
    updateRecall(original, "missed", at(1)).familiarity < original.familiarity,
  );
  assert.equal(
    updateRecall({ ...original, familiarity: 1 }, "got_it", at(1)).familiarity,
    1,
  );
});
test("summary reports useful actions and distinguishes viewed from read", () => {
  let store = start(5);
  const session = store.sessions[0];
  store = run(
    store,
    {
      type: "feedback",
      sessionId: session.id,
      ideaId: session.ideaIds[0],
      action: "save",
    },
    20,
  );
  store = run(
    store,
    { type: "end", sessionId: session.id, activeSeconds: 20 },
    40,
  );
  const summary = summarizeSession(store, store.sessions[0]);
  assert.equal(summary.saved, 1);
  assert.equal(summary.read, 1);
  assert.ok(summary.synthesis);
});
test("command validation rejects unreasonable contracts, weights and dwell", () => {
  assert.equal(
    commandSchema.safeParse({
      type: "start",
      contractType: "time",
      contractValue: -1,
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "tick",
      sessionId: "x",
      activeSeconds: -20,
    }).success,
    false,
  );
});
test("extending a historical session cannot create two unfinished contracts", () => {
  let store = start(5);
  const old = store.sessions[0].id;
  store = run(store, { type: "end", sessionId: old }, 5);
  store = run(
    store,
    { type: "start", contractType: "cards", contractValue: 5, topicFocus: [] },
    6,
  );
  assert.throws(() =>
    run(store, { type: "extend", sessionId: old, mode: "cards" }, 7),
  );
});
