import type { Session, Store } from "./types";

export function timeBudgetReached(session: Session, now: string) {
  return (
    session.contractType === "time" &&
    Boolean(session.deadline) &&
    Date.parse(now) >= Date.parse(session.deadline!)
  );
}

export function contractComplete(session: Session, now: string) {
  return session.contractType === "time"
    ? timeBudgetReached(session, now)
    : session.currentIndex >= session.cardLimit;
}

export function contractProgress(session: Session, now: string) {
  const startIndex = session.segmentStartIndex ?? 0;
  if (session.contractType === "cards")
    return Math.min(
      1,
      (session.currentIndex - startIndex) /
        Math.max(1, session.cardLimit - startIndex),
    );
  const startedAt = session.segmentStartedAt ?? session.startedAt;
  const duration = Date.parse(session.deadline!) - Date.parse(startedAt);
  return Math.min(
    1,
    Math.max(0, (Date.parse(now) - Date.parse(startedAt)) / duration),
  );
}

export function summarizeSession(store: Store, session: Session) {
  const events = store.events.filter((event) => event.sessionId === session.id);
  const count = (type: string) =>
    new Set(
      events
        .filter((event) => event.type === type)
        .map((event) => event.ideaId),
    ).size;
  const savedIds = [
    ...new Set(
      events
        .filter((event) => event.type === "save")
        .map((event) => event.ideaId),
    ),
  ];
  const kept = store.ideas.filter(
    (idea) =>
      savedIds.includes(idea.id) &&
      store.states.find((state) => state.ideaId === idea.id)?.saved,
  );
  const views = events.filter((event) => event.type === "card_view");
  return {
    viewed: new Set(views.map((event) => event.ideaId)).size,
    read: views.filter((event) => Number(event.metadata?.dwellSeconds) >= 10)
      .length,
    saved: kept.length,
    known: count("mark_known"),
    deepDives: count("deep_dive"),
    sourcesOpened: count("source_open"),
    recalled: events.filter(
      (event) =>
        event.type === "recall_answered" && event.metadata?.result === "got_it",
    ).length,
    kept,
    synthesis:
      kept[0]?.oneSentence ??
      store.ideas.find(
        (idea) =>
          idea.id ===
          views.find((event) => Number(event.metadata?.dwellSeconds) >= 10)
            ?.ideaId,
      )?.oneSentence,
    elapsedMinutes: Math.max(
      1,
      Math.round(
        (Date.parse(session.endedAt ?? session.lastActivityAt) -
          Date.parse(session.startedAt)) /
          60_000,
      ),
    ),
  };
}
