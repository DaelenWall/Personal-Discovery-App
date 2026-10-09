"use client";

import { useState } from "react";
import { useApp } from "./app-provider";
import { AISetup } from "./ai-setup";
import { useRouter } from "./navigation";
import { DeviceData } from "./device-data";

export function Settings() {
  const { store, command, busy, request, isPhone } = useApp();
  const router = useRouter();
  const [draft, setDraft] = useState(() => store!.settings);
  const [customTopic, setCustomTopic] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saved, setSaved] = useState(false);
  async function save() {
    const updated = await command({ type: "settings", ...draft });
    if (updated) setSaved(true);
  }
  async function reset() {
    const updated = await request("/api/reset", { confirm });
    if (updated?.store) router.push("/");
  }
  return (
    <div className="settings-page">
      <div className="page-heading">
        <p className="eyebrow">MAKE THIS YOURS</p>
        <h1>Attention, on your terms.</h1>
        <p>
          Small, transparent controls. Your reading history stays in the local
          database.
        </p>
      </div>
      <div className="settings-grid">
        <section className="settings-section">
          <h2>Session defaults</h2>
          <label className="field">
            Default time budget (minutes)
            <input
              type="number"
              value={draft.defaultMinutes}
              min="1"
              max="60"
              onChange={(event) => {
                setSaved(false);
                setDraft({
                  ...draft,
                  defaultMinutes: Number(event.target.value),
                });
              }}
            />
          </label>
          <label className="field">
            Enough sensitivity
            <select
              value={draft.enoughSensitivity}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  enoughSensitivity: event.target.value as
                    "balanced" | "conservative",
                })
              }
            >
              <option value="conservative">
                Conservative · 10 rapid passive cards
              </option>
              <option value="balanced">Balanced · 8 rapid passive cards</option>
            </select>
          </label>
          <p className="microcopy">
            Both require a low recent dwell median and a run without meaningful
            action. Normal reading and reaching your time budget do not trigger
            Enough.
          </p>
          <label className="field">
            Appearance
            <select
              value={draft.theme}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  theme: event.target.value as "system" | "light" | "dark",
                })
              }
            >
              <option value="system">Follow system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void save()}
          >
            Save preferences
          </button>
          {saved && (
            <p className="status-message" role="status">
              Preferences saved locally.
            </p>
          )}
        </section>
        <section className="settings-section">
          <h2>Topic preferences</h2>
          <p className="section-description">
            −1 means less of this. +1 means more. Explicit feedback adjusts
            these slowly.
          </p>
          <div className="topic-sliders">
            {Object.entries(draft.topicWeights).map(([topic, weight]) => (
              <label key={topic}>
                <span>{topic}</span>
                <input
                  aria-label={`${topic} preference`}
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={weight}
                  onChange={(event) => {
                    setSaved(false);
                    setDraft({
                      ...draft,
                      topicWeights: {
                        ...draft.topicWeights,
                        [topic]: Number(event.target.value),
                      },
                    });
                  }}
                />
                <output>
                  {weight > 0 ? "+" : ""}
                  {weight.toFixed(2)}
                </output>
              </label>
            ))}
          </div>
          <div className="custom-topic">
            <label className="field">
              Add your own topic
              <input
                value={customTopic}
                maxLength={80}
                onChange={(event) => setCustomTopic(event.target.value)}
              />
            </label>
            <button
              disabled={
                !customTopic.trim() ||
                Object.keys(draft.topicWeights).length >= 100
              }
              onClick={() => {
                setDraft({
                  ...draft,
                  topicWeights: {
                    ...draft.topicWeights,
                    [customTopic.trim()]: 0,
                  },
                });
                setCustomTopic("");
                setSaved(false);
              }}
            >
              Add topic
            </button>
          </div>
          <p className="microcopy">
            Custom topics become selectable after saving. Tag an imported idea
            with the same topic to include it in a focused session.
          </p>
        </section>
        <AISetup />
        <section className="settings-section">
          <h2>Your local data</h2>
          <p className="section-description">
            Export sources, ideas, notes, knowledge, preferences, sessions, and
            interaction events.
          </p>
          {isPhone ? (
            <DeviceData />
          ) : (
            <a className="button" href="/api/export" download>
              Export JSON ↓
            </a>
          )}
          <details className="reset-details">
            <summary>Delete local data</summary>
            <p>
              This removes your sources, notes, preferences, and history, then
              restores the seed collection. Export first if you want a copy.
            </p>
            <label className="field">
              Type DELETE MY LOCAL DATA
              <input
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="off"
              />
            </label>
            <button
              className="danger"
              disabled={busy || confirm !== "DELETE MY LOCAL DATA"}
              onClick={() => void reset()}
            >
              Delete and restore demo
            </button>
          </details>
        </section>
      </div>
    </div>
  );
}
