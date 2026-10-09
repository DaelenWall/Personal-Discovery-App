import type { Command } from "./commands";
import { contractComplete, timeBudgetReached } from "./contracts";
import { evaluateEnough, MEANINGFUL } from "./enough";
import {
  applyTopicFeedback,
  encounterConcept,
  evaluateRecall,
  updateRecall,
} from "./learning";
import { createBatch } from "./ranking";
import type { EventType, Session, Store, UserIdeaState } from "./types";

type Clock = { now: string; id: () => string };

export function applyCommand(
  input: Store,
  command: Command,
  clock: Clock,
): Store {
  const store = structuredClone(input);
  const { now, id } = clock;
  const event = (
    sessionId: string,
    type: EventType,
    ideaId?: string,
    metadata?: Record<string, unknown>,
  ) => {
    store.events.push({
      id: id(),
      sessionId,
      type,
      ideaId,
      metadata,
      createdAt: now,
    });
  };
  const stateFor = (ideaId: string): UserIdeaState => {
    let state = store.states.find((entry) => entry.ideaId === ideaId);
    if (!state) {
      state = { ideaId, status: "unseen", timesSeen: 0 };
      store.states.push(state);
    }
    return state;
  };
  const markVisible = (session: Session) => {
    const ideaId = session.ideaIds[session.currentIndex];
    if (!ideaId) return;
    const state = stateFor(ideaId);
    if (state.status === "unseen") state.status = "seen";
    state.firstSeenAt ??= now;
    state.lastSeenAt = now;
    state.timesSeen++;
    for (const concept of store.ideas.find((idea) => idea.id === ideaId)!
      .concepts) {
      const index = store.concepts.findIndex(
        (entry) => entry.concept === concept,
      );
      const updated = encounterConcept(concept, store.concepts[index], now);
      if (index < 0) store.concepts.push(updated);
      else store.concepts[index] = updated;
    }
  };
  const finalizeView = (session: Session) => {
    const ideaId = session.ideaIds[session.currentIndex];
    if (ideaId && !session.recallIdeaId)
      event(session.id, "card_view", ideaId, {
        dwellSeconds: Math.round(session.currentDwellSeconds * 10) / 10,
        index: session.currentIndex,
      });
    session.currentDwellSeconds = 0;
  };
  const finish = (session: Session, reason: Session["endReason"]) => {
    session.status = "ended";
    session.endReason = reason;
    session.endedAt = now;
    session.lastActivityAt = now;
    session.recallIdeaId = undefined;
    session.recallCompleted = undefined;
    event(session.id, "session_end", undefined, { reason });
  };

  if (command.type === "start") {
    // An unfinished contract always resumes; opening the app cannot re-roll it.
    if (store.sessions.some((session) => session.status !== "ended"))
      return store;
    if (command.contractType === "cards" && command.contractValue > 30)
      throw new Error("A card session can contain at most 30 ideas.");
    const batch = createBatch(
      store,
      command.contractType === "cards" ? command.contractValue : 15,
      command.topicFocus,
    );
    if (!batch.ideaIds.length)
      throw new Error(
        "No eligible ideas for these topics. Try a mixed session or add a source.",
      );
    const session: Session = {
      id: id(),
      startedAt: now,
      contractType: command.contractType,
      contractValue: command.contractValue,
      topicFocus: command.topicFocus,
      extensionCount: 0,
      enoughTriggered: false,
      status: "active",
      currentIndex: 0,
      currentDwellSeconds: 0,
      lastActivityAt: now,
      deadline:
        command.contractType === "time"
          ? new Date(
              Date.parse(now) + command.contractValue * 60_000,
            ).toISOString()
          : undefined,
      cardLimit: Math.min(command.contractValue, batch.ideaIds.length),
      enoughWindowStart: now,
      recallOffered: false,
      ...batch,
    };
    store.sessions.push(session);
    markVisible(session);
    return store;
  }
  if (command.type === "settings") {
    store.settings = {
      defaultMinutes: command.defaultMinutes,
      enoughSensitivity: command.enoughSensitivity,
      topicWeights: command.topicWeights,
      theme: command.theme,
    };
    return store;
  }
  if (command.type === "note") {
    if (!store.ideas.some((idea) => idea.id === command.ideaId))
      throw new Error("Idea not found.");
    stateFor(command.ideaId).userNote = command.note;
    return store;
  }

  const session = command.sessionId
    ? store.sessions.find((entry) => entry.id === command.sessionId)
    : undefined;
  if (command.sessionId && !session) throw new Error("Session not found.");
  if (
    session &&
    "expectedIndex" in command &&
    command.expectedIndex !== undefined &&
    command.expectedIndex !== session.currentIndex &&
    command.type !== "feedback"
  )
    throw new Error("This session moved in another tab. Reload to resume.");
  if (session?.status === "active") {
    const elapsed = Math.max(
      0,
      (Date.parse(now) - Date.parse(session.lastActivityAt)) / 1000,
    );
    const active = Math.min(elapsed, command.activeSeconds ?? 0);
    if (!session.recallIdeaId) session.currentDwellSeconds += active;
    session.lastActivityAt = now;
    if (timeBudgetReached(session, now) && !session.timeBudgetExpiredAt) {
      session.timeBudgetExpiredAt = session.deadline;
      event(
        session.id,
        "time_budget_reached",
        session.ideaIds[session.currentIndex],
        { deadline: session.deadline },
      );
    }
  }

  if (command.type === "feedback") {
    const idea = store.ideas.find((entry) => entry.id === command.ideaId);
    if (!idea) throw new Error("Idea not found.");
    const state = stateFor(idea.id);
    const scope = session?.id ?? "library";
    const repeated = store.events.some(
      (entry) =>
        entry.sessionId === scope &&
        entry.ideaId === idea.id &&
        entry.type === command.action,
    );
    if (command.action === "save") {
      state.saved = true;
      if (state.status !== "known") state.status = "saved";
    }
    if (command.action === "dismiss") {
      state.status = "dismissed";
    }
    if (command.action === "mark_known") {
      state.status = "known";
      for (const concept of idea.concepts) {
        let entry = store.concepts.find((item) => item.concept === concept);
        if (!entry) {
          entry = encounterConcept(concept, undefined, now);
          store.concepts.push(entry);
        }
        entry.familiarity = Math.max(entry.familiarity, 0.85);
        entry.confidence = Math.max(entry.confidence, 0.65);
      }
    }
    if (
      !repeated ||
      ["source_open", "deep_dive", "ask"].includes(command.action)
    )
      event(scope, command.action, idea.id);
    if (!repeated) {
      if (command.action !== "source_open")
        store.settings = applyTopicFeedback(
          store.settings,
          idea.topics,
          command.action,
        );
    }
    return store;
  }
  if (!session) throw new Error("A session is required.");
  if (command.type === "dismiss_time_reminder") {
    if (
      session.status === "active" &&
      timeBudgetReached(session, now) &&
      !session.timeReminderDismissedAt
    ) {
      session.timeReminderDismissedAt = now;
      event(session.id, "time_reminder_dismissed");
    }
    return store;
  }
  if (command.type === "extend") {
    if (session.status === "active")
      throw new Error("Finish the planned session before extending.");
    if (
      store.sessions.some(
        (entry) => entry.id !== session.id && entry.status !== "ended",
      )
    )
      throw new Error(
        "Resume your unfinished session before extending an earlier one.",
      );
    const count = command.mode === "cards" ? 3 : 5;
    const currentWasViewed = store.events.some(
      (entry) =>
        entry.sessionId === session.id &&
        entry.type === "card_view" &&
        entry.metadata?.index === session.currentIndex,
    );
    const remainingIds = session.ideaIds.slice(
      session.currentIndex + (currentWasViewed ? 1 : 0),
    );
    const availableRemaining = remainingIds.filter(
      (ideaId) => !["known", "dismissed"].includes(stateFor(ideaId).status),
    );
    const needed = Math.max(0, count - availableRemaining.length);
    const batch = needed
      ? createBatch(store, needed, session.topicFocus, session.ideaIds)
      : { ideaIds: [], ranking: {} };
    const nextIds = [...availableRemaining, ...batch.ideaIds].slice(0, count);
    if (!nextIds.length)
      throw new Error(
        "You have reached the end of this collection. Add a source or choose one idea to explore.",
      );
    const completedIds = session.ideaIds.slice(0, session.currentIndex);
    // A current card was finalized when a time/manual contract ended.
    if (currentWasViewed && session.ideaIds[session.currentIndex])
      completedIds.push(session.ideaIds[session.currentIndex]);
    session.ideaIds = [...completedIds, ...nextIds];
    session.currentIndex = completedIds.length;
    session.segmentStartIndex = completedIds.length;
    session.segmentStartedAt = now;
    session.ranking = { ...session.ranking, ...batch.ranking };
    session.contractType = command.mode;
    session.cardLimit = session.ideaIds.length;
    session.deadline =
      command.mode === "time"
        ? new Date(Date.parse(now) + 300_000).toISOString()
        : undefined;
    session.timeBudgetExpiredAt = undefined;
    session.timeReminderDismissedAt = undefined;
    session.extensionCount++;
    session.status = "active";
    session.endedAt = undefined;
    session.endReason = undefined;
    session.lastActivityAt = now;
    session.currentDwellSeconds = 0;
    session.enoughWindowStart = now;
    session.recallIdeaId = undefined;
    session.recallCompleted = undefined;
    event(session.id, "session_extend", undefined, {
      mode: command.mode,
      count: nextIds.length,
      minutes: command.mode === "time" ? 5 : undefined,
    });
    markVisible(session);
    return store;
  }
  if (session.status === "ended") return store;
  if (command.type === "end") {
    if (session.status === "active") finalizeView(session);
    finish(session, session.status === "enough" ? "enough" : "manual");
    return store;
  }
  if (session.status === "enough") return store;
  if (command.type === "recall") {
    if (!session.recallIdeaId) throw new Error("No recall prompt is pending.");
    if (session.recallCompleted) return store;
    const idea = store.ideas.find(
      (entry) => entry.id === session.recallIdeaId,
    )!;
    if (!command.skip) {
      if (command.answer === undefined)
        throw new Error("Choose an answer or skip the prompt.");
      const result = evaluateRecall(idea, command.answer);
      event(session.id, "recall_answered", idea.id, {
        result,
        answer: command.answer,
        evaluation:
          typeof command.answer === "string"
            ? "approximate_keywords"
            : "multiple_choice",
      });
      for (const concept of idea.concepts) {
        const index = store.concepts.findIndex(
          (entry) => entry.concept === concept,
        );
        const previous = encounterConcept(concept, store.concepts[index], now);
        const updated = updateRecall(previous, result, now);
        if (index < 0) store.concepts.push(updated);
        else store.concepts[index] = updated;
      }
    }
    // Finish recall in place if time ran out while it was open. Revealing the
    // queued card would otherwise introduce a new idea after the boundary.
    if (timeBudgetReached(session, now)) {
      session.recallCompleted = true;
      return store;
    }
    session.recallIdeaId = undefined;
    markVisible(session);
    return store;
  }
  if (command.type === "advance") {
    if (timeBudgetReached(session, now)) {
      finalizeView(session);
      finish(session, "contract");
      return store;
    }
    if (session.recallIdeaId) throw new Error("Answer or skip recall first.");
    finalizeView(session);
    session.currentIndex++;
    if (contractComplete(session, now)) {
      finish(session, "contract");
      return store;
    }
    if (session.currentIndex >= session.ideaIds.length) {
      finish(session, "batch");
      return store;
    }
    const events = store.events.filter(
      (entry) => entry.sessionId === session.id,
    );
    const enough = evaluateEnough(
      events,
      now,
      session.enoughWindowStart,
      store.settings.enoughSensitivity,
    );
    if (enough.triggered) {
      session.status = "enough";
      session.enoughTriggered = true;
      event(session.id, "enough_triggered", undefined, { ...enough });
      return store;
    }
    const substantive = events.filter(
      (entry) =>
        entry.type === "card_view" &&
        (Number(entry.metadata?.dwellSeconds) >= 10 ||
          events.some(
            (other) =>
              other.ideaId === entry.ideaId && MEANINGFUL.has(other.type),
          )),
    );
    if (!session.recallOffered && substantive.length >= 5) {
      const recalledIdea = store.ideas.find(
        (idea) =>
          substantive.some((entry) => entry.ideaId === idea.id) && idea.recall,
      );
      session.recallOffered = true;
      if (recalledIdea) {
        session.recallIdeaId = recalledIdea.id;
        event(session.id, "recall_shown", recalledIdea.id);
        return store;
      }
    }
    markVisible(session);
  }
  return store;
}
