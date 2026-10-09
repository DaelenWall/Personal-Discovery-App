"use client";

import Link from "./navigation";
import { useSearchParams } from "./navigation";
import { useEffect, useState } from "react";
import { useApp } from "./app-provider";
import { useReading } from "./use-reading";
import { TimeReminder } from "./time-reminder";

export function IdeaView({ id }: { id: string }) {
  const { store, command, request, busy, aiMode } = useApp();
  const params = useSearchParams();
  const sessionId = params.get("session") ?? undefined;
  const session = store?.sessions.find((entry) => entry.id === sessionId);
  const take = useReading(
    session?.ideaIds[session.currentIndex] === id ? session : undefined,
  );
  const [note, setNote] = useState(
    () => store?.states.find((state) => state.ideaId === id)?.userNote ?? "",
  );
  const [noteSaved, setNoteSaved] = useState(false);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<
    { role: "user" | "assistant"; content: string; mode?: string }[]
  >([]);
  useEffect(() => {
    if (!session || session.status !== "active") return;
    const timer = window.setInterval(() => {
      if (!busy)
        void command({
          type: "tick",
          sessionId: session.id,
          activeSeconds: take(),
        });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [session, busy, command, take]);
  if (!store) return null;
  const idea = store.ideas.find((entry) => entry.id === id);
  if (!idea)
    return (
      <div className="empty-state">
        <h1>Idea not found</h1>
        <Link href="/">Back to discovery</Link>
      </div>
    );
  const source = store.sources.find((entry) => entry.id === idea.sourceId)!;
  const state = store.states.find((entry) => entry.ideaId === id);
  const related = store.ideas
    .filter(
      (entry) =>
        entry.id !== id &&
        entry.concepts.some((concept) => idea.concepts.includes(concept)),
    )
    .slice(0, 4);
  const feedback = (
    action: "save" | "mark_known" | "source_open" | "deep_dive",
  ) =>
    command({
      type: "feedback",
      ideaId: id,
      sessionId,
      action,
      activeSeconds: take(),
    });
  async function ask() {
    const asked = question.trim();
    if (!asked) return;
    const response = await request("/api/ask", {
      ideaId: id,
      sessionId,
      question: asked,
      history: chat.slice(-6),
    });
    if (response?.answer) {
      setChat([
        ...chat,
        { role: "user", content: asked },
        {
          role: "assistant",
          content: String(response.answer),
          mode: String(response.mode),
        },
      ]);
      setQuestion("");
    }
  }
  async function saveNote() {
    if (await command({ type: "note", ideaId: id, note })) setNoteSaved(true);
  }
  return (
    <div className="deep-page">
      <div className="session-toolbar">
        <Link
          className="text-link"
          href={sessionId ? `/session/${sessionId}` : "/library"}
        >
          ←{" "}
          {sessionId
            ? session?.status === "ended"
              ? "Session summary"
              : "Back to session"
            : "Library"}
        </Link>
        <span className="eyebrow">ONE IDEA, MORE DEPTH</span>
      </div>
      <TimeReminder session={session} takeActiveSeconds={take} />
      {session?.status === "ended" && (
        <p className="contract-warning">
          Your session has ended. Return to its summary when you’re ready.
        </p>
      )}
      <header className="deep-header">
        <p className="eyebrow">{idea.topics.join(" / ")}</p>
        <h1>{idea.title}</h1>
        <p className="idea-thesis">{idea.oneSentence}</p>
        <p className="microcopy">
          {idea.interpretation === "editorial"
            ? "Original editorial interpretation. Examples are constructed for this app."
            : idea.interpretation === "ai"
              ? "AI interpretation. Check claims against the source text."
              : "Source extract. No AI-generated claims."}
        </p>
        <div className="button-row">
          <button
            className={state?.saved ? "saved-action" : "primary"}
            disabled={busy || state?.saved}
            onClick={() => void feedback("save")}
          >
            {state?.saved ? "✓ Saved" : "+ Save idea"}
          </button>
          <button
            disabled={busy || state?.status === "known"}
            onClick={() => void feedback("mark_known")}
          >
            {state?.status === "known" ? "✓ Known" : "Already know this"}
          </button>
          {source.url && (
            <a
              className="button"
              href={source.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => void feedback("source_open")}
            >
              Original source ↗
            </a>
          )}
        </div>
      </header>
      <div className="deep-sections">
        <section>
          <span className="section-number">01</span>
          <h2>The idea</h2>
          <p>{idea.shortExplanation}</p>
        </section>
        <section>
          <span className="section-number">02</span>
          <h2>How it works</h2>
          <p>
            {idea.deeperExplanation ??
              "Read the source text for the full explanation."}
          </p>
        </section>
        <section>
          <span className="section-number">03</span>
          <h2>A concrete example</h2>
          <p>
            {idea.example ?? "No example has been generated for this source."}
          </p>
        </section>
        <section>
          <span className="section-number">04</span>
          <h2>Why it matters</h2>
          <p>{idea.whyItMatters}</p>
        </section>
        <section>
          <span className="section-number">05</span>
          <h2>Where it has limits</h2>
          <p>{idea.counterpoint}</p>
        </section>
        <section>
          <span className="section-number">06</span>
          <h2>Connections</h2>
          <div className="topic-chips">
            {idea.concepts.map((concept) => (
              <span key={concept}>{concept}</span>
            ))}
          </div>
          {related.map((entry) => (
            <Link
              className="kept-link"
              href={`/idea/${entry.id}${sessionId ? `?session=${sessionId}` : ""}`}
              key={entry.id}
            >
              {entry.title}
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </section>
      </div>
      <section className="provenance">
        <p className="eyebrow">SOURCE PROVENANCE</p>
        <h2>{source.title}</h2>
        <p>
          {[source.author, source.publisher, source.publishedAt]
            .filter(Boolean)
            .join(" · ") || "Personal source"}
        </p>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => void feedback("source_open")}
          >
            {source.url}
          </a>
        )}
        {idea.supportingExcerpt && (
          <details>
            <summary>Supporting source extract</summary>
            <blockquote>{idea.supportingExcerpt}</blockquote>
          </details>
        )}
        <details>
          <summary>
            {source.type === "seed"
              ? "Inspect editorial source note"
              : "Inspect preserved source text"}
          </summary>
          <p className="source-text">{source.rawText}</p>
        </details>
      </section>
      <section id="ask" className="ask-panel">
        <div className="ask-heading">
          <h2>Ask about this idea</h2>
          <span className="mode-pill">
            {aiMode === "demo"
              ? "Stored explanations"
              : "OpenAI · source grounded"}
          </span>
        </div>
        <p className="section-description">
          {aiMode === "demo"
            ? "You can ask for the stored example, mechanism, or limitation. Connect OpenAI for new explanations and follow-up questions."
            : "The idea, source text, and a few related saved concepts are included. Source claims and interpretation should be distinguished."}
        </p>
        {aiMode !== "openai" && (
          <Link className="button" href="/settings#ai">
            Set up Ask with OpenAI →
          </Link>
        )}
        <div className="chat-log" aria-live="polite">
          {chat.map((message, index) => (
            <div className={`chat-message ${message.role}`} key={index}>
              <span className="eyebrow">
                {message.role === "user"
                  ? "YOU"
                  : message.mode === "demo"
                    ? "STORED EXPLANATION"
                    : "AI INTERPRETATION"}
              </span>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void ask();
          }}
        >
          <label className="field">
            Your question
            <textarea
              placeholder="What’s a concrete example?"
              value={question}
              maxLength={2000}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>
          <button
            className="primary"
            disabled={busy || question.trim().length < 3}
          >
            {busy ? "Working…" : "Ask question"} ↗
          </button>
        </form>
      </section>
      <section className="notes-panel">
        <h2>Your notes</h2>
        <p className="section-description">
          Connect this to something you know. Notes stay local.
        </p>
        <label className="field">
          A thought to keep
          <textarea
            value={note}
            maxLength={10000}
            onChange={(event) => {
              setNote(event.target.value);
              setNoteSaved(false);
            }}
          />
        </label>
        <button disabled={busy} onClick={() => void saveNote()}>
          Save note
        </button>
        {noteSaved && (
          <p className="status-message" role="status">
            Note saved locally.
          </p>
        )}
      </section>
      <Link
        className="secondary-link"
        href={sessionId ? `/session/${sessionId}` : "/"}
      >
        {sessionId ? "Return to your session" : "Done for now"} →
      </Link>
    </div>
  );
}
