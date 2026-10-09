"use client";

import { useState } from "react";
import Link from "./navigation";
import { useApp } from "./app-provider";

export function Knowledge() {
  const { store } = useApp();
  const [filter, setFilter] = useState("all");
  if (!store) return null;
  const concepts = store.concepts
    .filter(
      (concept) =>
        filter === "all" ||
        (filter === "known"
          ? concept.familiarity >= 0.7
          : concept.successfulRecalls > 0),
    )
    .sort((a, b) => a.concept.localeCompare(b.concept));
  return (
    <div>
      <div className="page-heading">
        <p className="eyebrow">CONNECTIONS, NOT A SCOREBOARD</p>
        <h1>What you’re coming to know.</h1>
        <p>
          A working estimate of familiarity. Your corrections and recall matter
          more than time spent reading.
        </p>
      </div>
      <div className="button-row knowledge-filters">
        {[
          ["all", "Encountered"],
          ["known", "Marked / likely known"],
          ["recalled", "Successfully recalled"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={filter === value}
            className={filter === value ? "selected" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="knowledge-list">
        {concepts.map((concept) => {
          const related = store.ideas.filter((idea) =>
            idea.concepts.includes(concept.concept),
          );
          return (
            <article key={concept.concept}>
              <div>
                <h2>{concept.concept}</h2>
                <p>
                  {concept.successfulRecalls
                    ? `Recalled ${concept.successfulRecalls} ${concept.successfulRecalls === 1 ? "time" : "times"}`
                    : concept.familiarity >= 0.7
                      ? "Marked known"
                      : "Encountered · still exploring"}
                  {concept.lastRecalledAt
                    ? ` · last recall ${new Date(concept.lastRecalledAt).toLocaleDateString()}`
                    : ""}
                </p>
                <div className="concept-links">
                  {related.slice(0, 3).map((idea) => (
                    <Link key={idea.id} href={`/idea/${idea.id}`}>
                      {idea.title} ↗
                    </Link>
                  ))}
                </div>
              </div>
              <div className="familiarity">
                <span>Estimated familiarity</span>
                <meter
                  value={concept.familiarity}
                  min="0"
                  max="1"
                  aria-label={`${concept.concept} familiarity`}
                />
                <small>
                  {Math.round(concept.familiarity * 100)}% · confidence{" "}
                  {Math.round(concept.confidence * 100)}%
                </small>
              </div>
            </article>
          );
        })}
      </div>
      {!concepts.length && (
        <div className="empty-state">
          <h2>
            {store.concepts.length
              ? "No concepts in this view yet."
              : "Your map starts with one idea."}
          </h2>
          <p>
            Encounter an idea, mark it known, or answer a recall prompt.
            Connections will appear here.
          </p>
        </div>
      )}
      <section className="preference-overview">
        <h2>Your topic profile</h2>
        <div className="topic-chips">
          {Object.entries(store.settings.topicWeights)
            .filter(([, weight]) => weight !== 0)
            .sort((a, b) => b[1] - a[1])
            .map(([topic, weight]) => (
              <span key={topic}>
                {topic} · {weight > 0 ? "+" : ""}
                {weight.toFixed(2)}
              </span>
            ))}
        </div>
        <Link className="text-link" href="/settings">
          Adjust your preferences →
        </Link>
      </section>
    </div>
  );
}
