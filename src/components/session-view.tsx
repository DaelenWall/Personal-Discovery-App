"use client";

import Link from "./navigation";
import { useEffect, useState } from "react";
import { useRouter } from "./navigation";
import {
  contractProgress,
  summarizeSession,
  timeBudgetReached,
} from "@/domain/contracts";
import type { Command } from "@/domain/commands";
import { useApp } from "./app-provider";
import { useReading } from "./use-reading";
import { TimeReminder } from "./time-reminder";

export function SessionView({ id }: { id: string }) {
  const { store, command, busy } = useApp();
  const router = useRouter();
  const session = store?.sessions.find((entry) => entry.id === id);
  const take = useReading(session);
  const [now, setNow] = useState(() => new Date().toISOString());
  const [recallText, setRecallText] = useState("");
  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(new Date().toISOString()),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!session || session.status !== "active") return;
    const timer = window.setInterval(() => {
      if (!busy)
        void command({
          type: "tick",
          sessionId: id,
          expectedIndex: session.currentIndex,
          activeSeconds: take(),
        });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [session, command, busy, id, take]);
  if (!store) return null;
  if (!session)
    return (
      <div className="empty-state">
        <h1>Session not found</h1>
        <Link href="/">Choose a session</Link>
      </div>
    );
  const idea = store.ideas.find(
    (entry) => entry.id === session.ideaIds[session.currentIndex],
  );
  const source = store.sources.find((entry) => entry.id === idea?.sourceId);
  const state = store.states.find((entry) => entry.ideaId === idea?.id);
  const remainingMinutes = Math.max(
    0,
    Math.ceil((Date.parse(session.deadline ?? now) - Date.parse(now)) / 60_000),
  );
  const progress = contractProgress(session, now);
  const timeExpired = timeBudgetReached(session, now);
  const fields = {
    sessionId: id,
    expectedIndex: session.currentIndex,
    activeSeconds: 0,
  };
  async function act(action: Command) {
    return command({ ...action, activeSeconds: take() } as Command);
  }
  async function feedback(
    action:
      | "save"
      | "mark_known"
      | "dismiss"
      | "more_like_this"
      | "source_open"
      | "deep_dive",
  ) {
    if (!idea) return;
    const updated = await act({
      type: "feedback",
      ...fields,
      ideaId: idea.id,
      action,
    });
    if (updated && (action === "dismiss" || action === "mark_known"))
      await command({ type: "advance", ...fields, activeSeconds: take() });
    if (updated && action === "deep_dive")
      router.push(`/idea/${idea.id}?session=${id}`);
  }
  const endButton = (
    <button
      className="text-button"
      disabled={busy}
      onClick={() => void act({ type: "end", ...fields })}
    >
      End session
    </button>
  );

  if (session.status === "ended") {
    const summary = summarizeSession(store, session);
    return (
      <div className="summary-page narrow">
        <p className="eyebrow">A GOOD PLACE TO STOP</p>
        <div className="end-mark" aria-hidden="true">
          ◫
        </div>
        <h1>
          {session.endReason === "contract"
            ? "That’s the session you planned."
            : session.endReason === "batch"
              ? "That’s this collection."
              : "Your attention can rest."}
        </h1>
        <p className="lede">
          You read {summary.read} {summary.read === 1 ? "idea" : "ideas"}.
          {summary.saved
            ? ` ${summary.saved === 1 ? "One was" : `${summary.saved} were`} worth keeping.`
            : " Take one thought with you."}
        </p>
        <div className="summary-stats">
          <div>
            <strong>{summary.viewed}</strong>
            <span>ideas viewed</span>
          </div>
          <div>
            <strong>{summary.saved}</strong>
            <span>saved</span>
          </div>
          <div>
            <strong>{summary.deepDives}</strong>
            <span>deep dives</span>
          </div>
          <div>
            <strong>{summary.sourcesOpened}</strong>
            <span>sources opened</span>
          </div>
          <div>
            <strong>{summary.recalled}</strong>
            <span>concepts recalled</span>
          </div>
        </div>
        <p className="microcopy">
          {summary.elapsedMinutes} minutes elapsed · {session.extensionCount}{" "}
          intentional{" "}
          {session.extensionCount === 1 ? "extension" : "extensions"}. “Read”
          counts cards with at least 10 seconds of visible attention.
        </p>
        {summary.kept.length > 0 && (
          <section className="summary-section">
            <h2>Worth keeping</h2>
            {summary.kept.map((entry) => (
              <Link
                className="kept-link"
                key={entry.id}
                href={`/idea/${entry.id}`}
              >
                {entry.title}
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </section>
        )}
        {summary.synthesis && (
          <section className="remember">
            <p className="eyebrow">ONE THING TO REMEMBER</p>
            <p>{summary.synthesis}</p>
            <span className="microcopy">From this session’s material</span>
          </section>
        )}
        <Link href="/" className="button primary full">
          Done <span aria-hidden="true">→</span>
        </Link>
        {summary.kept[0] && (
          <Link className="secondary-link" href={`/idea/${summary.kept[0].id}`}>
            Go deeper on one saved idea ↗
          </Link>
        )}
        <details className="extension-details">
          <summary>Intentionally extend this session</summary>
          <p>Choose a new, small boundary.</p>
          <div className="button-row">
            <button
              disabled={busy}
              onClick={() =>
                void command({ type: "extend", ...fields, mode: "time" })
              }
            >
              +5 minutes
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void command({ type: "extend", ...fields, mode: "cards" })
              }
            >
              +3 ideas
            </button>
          </div>
        </details>
      </div>
    );
  }
  if (session.status === "enough") {
    const trigger = [...store.events]
      .reverse()
      .find(
        (event) => event.sessionId === id && event.type === "enough_triggered",
      );
    const recent = store.events.filter(
      (event) => event.sessionId === id && event.type === "card_view",
    );
    const pick = store.ideas.find(
      (entry) => entry.id === recent.at(-1)?.ideaId,
    );
    return (
      <div className="enough-page narrow">
        <p className="eyebrow">A MOMENT TO NOTICE</p>
        <h1>Enough.</h1>
        <p className="lede">
          You’ve moved through{" "}
          {String(
            trigger?.metadata?.reason === "passive_run"
              ? trigger.metadata.recentViews
              : (trigger?.metadata?.fastViews ?? 10),
          )}{" "}
          cards quickly, with a recent median of{" "}
          {Number(trigger?.metadata?.medianDwell ?? 0).toFixed(1)} seconds per
          card.
        </p>
        <p>
          During that run, you haven’t saved, marked known, opened a source,
          asked a question, answered recall, or gone deeper.
        </p>
        <p className="enough-fact">
          This looks more like scrolling than learning.
        </p>
        <button
          className="primary full"
          disabled={busy}
          onClick={() => void command({ type: "end", ...fields })}
        >
          End session <span aria-hidden="true">→</span>
        </button>
        {pick && (
          <Link className="button full" href={`/idea/${pick.id}?session=${id}`}>
            Pick one idea to go deeper on ↗
          </Link>
        )}
        <details className="extension-details">
          <summary>Choose to continue</summary>
          <p>Set a new boundary rather than continuing automatically.</p>
          <button
            disabled={busy}
            onClick={() =>
              void command({ type: "extend", ...fields, mode: "time" })
            }
          >
            Continue for 5 minutes
          </button>
        </details>
      </div>
    );
  }
  const recalled = session.recallIdeaId
    ? store.ideas.find((entry) => entry.id === session.recallIdeaId)
    : undefined;
  const lastRecall = [...store.events]
    .reverse()
    .find(
      (event) => event.sessionId === id && event.type === "recall_answered",
    );
  return (
    <div className="reading-page">
      <div className="session-toolbar">
        <Link href="/" className="text-link">
          ← Session home
        </Link>
        {endButton}
      </div>
      <div className="session-progress">
        <div>
          <span>
            {session.contractType === "time"
              ? timeExpired
                ? "Time budget reached"
                : `${remainingMinutes} min left`
              : `${Math.min(session.currentIndex + 1, session.cardLimit) - (session.segmentStartIndex ?? 0)} of ${session.cardLimit - (session.segmentStartIndex ?? 0)} ideas`}
          </span>
          <span>
            {session.topicFocus.length
              ? session.topicFocus.join(", ")
              : "A thoughtful mix"}
            {session.contractType === "time"
              ? ` · ${session.ideaIds.length - session.currentIndex} ideas remaining`
              : ""}
          </span>
        </div>
        <progress
          value={progress}
          max="1"
          aria-label="Session contract progress"
        />
      </div>
      <TimeReminder session={session} takeActiveSeconds={take} />
      {progress >= 0.8 && !timeExpired && (
        <p className="contract-warning" role="status">
          {session.contractType === "time"
            ? `${remainingMinutes} ${remainingMinutes === 1 ? "minute" : "minutes"} left in this session.`
            : `${session.cardLimit - session.currentIndex} ideas left in this session.`}
        </p>
      )}
      {recalled?.recall ? (
        <article className="idea-card recall-card">
          <p className="eyebrow">PAUSE & RECALL · OPTIONAL</p>
          <h1>What stayed with you?</h1>
          <p className="lede">{recalled.recall.question}</p>
          {session.recallCompleted ? (
            <div className="button-row">
              <p>Recall recorded. You can finish with this idea.</p>
              <button
                className="next-button"
                disabled={busy}
                onClick={() => void act({ type: "advance", ...fields })}
              >
                Next idea <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : (
            <>
              <div className="recall-options">
                {recalled.recall.options.map((option, index) => (
                  <button
                    key={option}
                    disabled={busy}
                    onClick={() =>
                      void act({ type: "recall", ...fields, answer: index })
                    }
                  >
                    {option}
                  </button>
                ))}
              </div>
              <details>
                <summary>Try explaining it in your own words</summary>
                <label className="field">
                  One sentence
                  <textarea
                    value={recallText}
                    onChange={(event) => setRecallText(event.target.value)}
                    maxLength={2000}
                  />
                </label>
                <p className="microcopy">
                  Demo evaluation uses approximate keyword matching. Multiple
                  choice is more reliable.
                </p>
                <button
                  disabled={busy || !recallText.trim()}
                  onClick={() =>
                    void act({ type: "recall", ...fields, answer: recallText })
                  }
                >
                  Record answer
                </button>
              </details>
              <div className="button-row">
                <button
                  disabled={busy}
                  onClick={() =>
                    void act({ type: "recall", ...fields, answer: -1 })
                  }
                >
                  I don’t remember
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    void act({ type: "recall", ...fields, skip: true })
                  }
                >
                  Skip this prompt
                </button>
              </div>
            </>
          )}
        </article>
      ) : (
        idea && (
          <>
            {lastRecall && (
              <p className="recall-result" role="status">
                Recall recorded:{" "}
                {lastRecall.metadata?.result === "got_it"
                  ? "got it"
                  : lastRecall.metadata?.result === "partly"
                    ? "partly"
                    : "not yet"}
                .{" "}
                {lastRecall.metadata?.result === "missed"
                  ? "The concept can appear again in a later session."
                  : "Your knowledge list has been updated."}
              </p>
            )}
            <article className="idea-card">
              <div className="card-meta">
                <span>{idea.topics.join(" / ")}</span>
                <span>
                  {Math.max(
                    1,
                    Math.ceil(idea.shortExplanation.split(/\s+/).length / 200),
                  )}{" "}
                  min read
                </span>
              </div>
              <h1>{idea.title}</h1>
              <p className="idea-thesis">{idea.oneSentence}</p>
              <p className="explanation">{idea.shortExplanation}</p>
              <div className="source-line">
                <span aria-hidden="true">↳</span>
                <span>
                  {source?.title}
                  <small>
                    {source?.publisher} ·{" "}
                    {idea.interpretation === "editorial"
                      ? "Original editorial paraphrase"
                      : idea.interpretation === "ai"
                        ? "AI interpretation · review against source"
                        : "Source extract"}
                  </small>
                </span>
              </div>
              <div className="card-actions">
                <button
                  className={state?.saved ? "saved-action" : ""}
                  disabled={busy || state?.saved}
                  onClick={() => void feedback("save")}
                >
                  {state?.saved ? "✓ Saved" : "+ Save"}
                </button>
                <button
                  disabled={busy}
                  onClick={() => void feedback("mark_known")}
                >
                  Already know this
                </button>
                <button
                  disabled={busy}
                  onClick={() => void feedback("dismiss")}
                >
                  Not for me
                </button>
              </div>
              <div className="depth-actions">
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void feedback("deep_dive")}
                >
                  Go deeper <span aria-hidden="true">↗</span>
                </button>
                <Link
                  className="button"
                  href={`/idea/${idea.id}?session=${id}#ask`}
                >
                  Ask a question
                </Link>
                {source?.url && (
                  <a
                    className="button"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => void feedback("source_open")}
                  >
                    Source ↗
                  </a>
                )}
              </div>
            </article>
            <div className="below-card">
              <button
                className="text-button"
                disabled={busy}
                onClick={() => void feedback("more_like_this")}
              >
                More like this
              </button>
              <button
                className="next-button"
                disabled={busy}
                onClick={() => void act({ type: "advance", ...fields })}
              >
                {session.currentIndex + 1 >= session.ideaIds.length ||
                (session.contractType === "cards" &&
                  session.currentIndex + 1 >= session.cardLimit)
                  ? "Finish session"
                  : "Next idea"}{" "}
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <details className="ranking-details">
              <summary>Why this idea?</summary>
              <p>{session.ranking[idea.id]?.reason}</p>
              <dl className="score-grid">
                {Object.entries(session.ranking[idea.id] ?? {})
                  .filter(([, value]) => typeof value === "number")
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{Number(value).toFixed(2)}</dd>
                    </div>
                  ))}
              </dl>
              <p className="microcopy">
                Weights: interest .30 · novelty .25 · depth .15 · source quality
                .15 · connection .10 · diversity .05. Dwell time is not a
                ranking input.
              </p>
            </details>
          </>
        )
      )}
    </div>
  );
}
