"use client";

import { useState } from "react";
import Link from "./navigation";
import { useRouter } from "./navigation";
import { useApp } from "./app-provider";
import { TOPICS } from "@/domain/types";

export function Home() {
  const { store, command, busy } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<"time" | "cards">("time");
  const [value, setValue] = useState(store?.settings.defaultMinutes ?? 10);
  const [custom, setCustom] = useState(false);
  const [focus, setFocus] = useState("");
  if (!store) return null;
  const active = store.sessions.find((session) => session.status !== "ended");
  const saved = store.states.filter((state) => state.saved).length;
  const learned = store.concepts.filter(
    (concept) => concept.successfulRecalls > 0,
  ).length;
  async function start() {
    const updated = await command({
      type: "start",
      contractType: mode,
      contractValue: value,
      topicFocus: focus ? [focus] : [],
    });
    const session = updated?.sessions.find((entry) => entry.status !== "ended");
    if (session) router.push(`/session/${session.id}`);
  }
  return (
    <div className="home-page">
      <section className="home-intro">
        <p className="eyebrow">CURIOSITY, WITH INTENTION</p>
        <h1>
          A little discovery.
          <br />
          <em>Then enough.</em>
        </h1>
        <p className="lede">
          Ideas worth understanding, not a feed worth finishing.
          <br className="desktop-break" /> Give your attention a boundary. Leave
          with something that stays.
        </p>
        <div className="intro-rule" />
        <p className="quiet-note">
          Discover → understand → connect → recall → stop
        </p>
      </section>
      <section className="contract-panel" aria-labelledby="contract-title">
        <div className="panel-label">
          <span className="eyebrow">YOUR NEXT SESSION</span>
          <span aria-hidden="true">↗</span>
        </div>
        <h2 id="contract-title">
          How much attention
          <br />
          are you giving this?
        </h2>
        {active ? (
          <div className="resume">
            <p>
              You have an unfinished{" "}
              {active.contractType === "time"
                ? `${active.contractValue}-minute`
                : `${active.cardLimit}-idea`}{" "}
              session. Your place is saved.
            </p>
            <Link
              className="button primary full"
              href={`/session/${active.id}`}
            >
              Resume your session <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <>
            <div className="segmented" aria-label="Contract type">
              <button
                aria-pressed={mode === "time"}
                onClick={() => {
                  setMode("time");
                  setValue(store.settings.defaultMinutes);
                  setCustom(false);
                }}
              >
                Time budget
              </button>
              <button
                aria-pressed={mode === "cards"}
                onClick={() => {
                  setMode("cards");
                  setValue(10);
                  setCustom(false);
                }}
              >
                Idea budget
              </button>
            </div>
            <div className="budget-options">
              {(mode === "time" ? [5, 10, 20] : [5, 10, 15]).map((n) => (
                <button
                  key={n}
                  className={value === n && !custom ? "selected" : ""}
                  aria-pressed={value === n && !custom}
                  onClick={() => {
                    setValue(n);
                    setCustom(false);
                  }}
                >
                  <strong>{n}</strong>
                  <span>{mode === "time" ? "minutes" : "ideas"}</span>
                </button>
              ))}
            </div>
            <button
              className="text-button custom-toggle"
              onClick={() => {
                setCustom(!custom);
              }}
            >
              Choose a custom budget {custom ? "−" : "+"}
            </button>
            {custom && (
              <label className="field">
                {mode === "time" ? "Minutes (1–60)" : "Ideas (1–30)"}
                <input
                  type="number"
                  min="1"
                  max={mode === "time" ? 60 : 30}
                  value={value}
                  onChange={(event) => setValue(Number(event.target.value))}
                />
              </label>
            )}
            <label className="field">
              What are you curious about?
              <select
                value={focus}
                onChange={(event) => setFocus(event.target.value)}
              >
                <option value="">A thoughtful mix · surprise me</option>
                {[
                  ...new Set([
                    ...TOPICS,
                    ...Object.keys(store.settings.topicWeights),
                  ]),
                ].map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </select>
            </label>
            <button
              className="primary full"
              disabled={
                busy || value < 1 || value > (mode === "time" ? 60 : 30)
              }
              onClick={() => void start()}
            >
              Start {value}
              {mode === "time" ? "-minute" : "-idea"} session{" "}
              <span aria-hidden="true">→</span>
            </button>
            <p className="microcopy">
              A finite collection. A visible ending. Always your choice.
            </p>
          </>
        )}
      </section>
      <section className="home-bottom">
        <div>
          <span className="section-number">01</span>
          <h3>Depth over more</h3>
          <p>
            Open an idea, question it, follow its source. Understanding is the
            point.
          </p>
        </div>
        <div>
          <span className="section-number">02</span>
          <h3>Your knowledge, remembered</h3>
          <p>
            {saved
              ? `${saved} saved ${saved === 1 ? "idea" : "ideas"} and ${learned} recalled concepts, stored here on your device.`
              : "Save what matters. Mark what you know. The next collection learns from both."}
          </p>
        </div>
        <div>
          <span className="section-number">03</span>
          <h3>Permission to stop</h3>
          <p>
            When reading becomes skimming, Enough helps you notice and step
            away.
          </p>
        </div>
      </section>
      {store.sessions.some((session) => session.status === "ended") && (
        <section className="history">
          <h2>Previous sessions</h2>
          {[...store.sessions]
            .reverse()
            .filter((session) => session.status === "ended")
            .slice(0, 5)
            .map((session) => (
              <Link key={session.id} href={`/session/${session.id}`}>
                <span>
                  {new Date(session.startedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · {session.contractValue}{" "}
                  {session.contractType === "time" ? "minutes" : "ideas"}
                </span>
                <span>View summary →</span>
              </Link>
            ))}
        </section>
      )}
    </div>
  );
}
