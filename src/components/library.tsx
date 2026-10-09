"use client";

import Link from "./navigation";
import { useState } from "react";
import { useApp } from "./app-provider";

export function Library() {
  const { store } = useApp();
  const [topic, setTopic] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  if (!store) return null;
  const allSaved = store.ideas.filter(
    (idea) => store.states.find((state) => state.ideaId === idea.id)?.saved,
  );
  const ideas = allSaved
    .filter((idea) => {
      const state = store.states.find((entry) => entry.ideaId === idea.id)!;
      const known =
        state.status === "known" ||
        idea.concepts.some(
          (name) =>
            store.concepts.find((concept) => concept.concept === name)
              ?.successfulRecalls,
        );
      return (
        (!topic || idea.topics.includes(topic)) &&
        (!source || idea.sourceId === source) &&
        (!status || (status === "learned" ? known : !known)) &&
        `${idea.title} ${idea.oneSentence} ${state.userNote ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    })
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : (
            store.events.findLast(
              (event) => event.ideaId === b.id && event.type === "save",
            )?.createdAt ?? b.createdAt
          ).localeCompare(
            store.events.findLast(
              (event) => event.ideaId === a.id && event.type === "save",
            )?.createdAt ?? a.createdAt,
          ),
    );
  return (
    <div>
      <div className="page-heading">
        <p className="eyebrow">WORTH KEEPING</p>
        <h1>Your library.</h1>
        <p>
          A few ideas you chose to stay with. Open one, add a note, or revisit
          its source.
        </p>
      </div>
      <div className="filters">
        <label className="field">
          Find an idea
          <input
            type="search"
            placeholder="Search titles and notes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="field">
          Topic
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          >
            <option value="">All topics</option>
            {[...new Set(allSaved.flatMap((idea) => idea.topics))].map(
              (topic) => (
                <option key={topic}>{topic}</option>
              ),
            )}
          </select>
        </label>
        <label className="field">
          Source
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="">All sources</option>
            {store.sources
              .filter((source) =>
                allSaved.some((idea) => idea.sourceId === source.id),
              )
              .map((source) => (
                <option value={source.id} key={source.id}>
                  {source.title}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          Understanding
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All ideas</option>
            <option value="learned">Learned / known</option>
            <option value="exploring">Exploring</option>
          </select>
        </label>
        <label className="field">
          Order
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="recent">Recently saved</option>
            <option value="title">Title</option>
          </select>
        </label>
      </div>
      {ideas.length ? (
        <div className="library-grid">
          {ideas.map((idea) => {
            const note = store.states.find(
              (state) => state.ideaId === idea.id,
            )?.userNote;
            return (
              <Link
                href={`/idea/${idea.id}`}
                key={idea.id}
                className="library-card"
              >
                <p className="eyebrow">{idea.topics.join(" / ")}</p>
                <h2>{idea.title}</h2>
                <p>{idea.oneSentence}</p>
                {note && <p className="note-preview">Your note: {note}</p>}
                <span className="library-source">
                  {store.sources.find((source) => source.id === idea.sourceId)
                    ?.publisher ?? "Personal source"}
                  <span aria-hidden="true">↗</span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>
            {allSaved.length
              ? "No ideas match these filters."
              : "A place for what stays."}
          </h2>
          <p>
            {allSaved.length
              ? "Try another topic or search."
              : "Save an idea during a session. It will be waiting here."}
          </p>
          <Link href="/" className="button">
            Choose a session →
          </Link>
        </div>
      )}
    </div>
  );
}
