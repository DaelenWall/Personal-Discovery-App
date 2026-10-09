"use client";

import { useState } from "react";
import { useRouter } from "./navigation";
import type { Source } from "@/domain/types";
import type { GeneratedDraft } from "@/server/ai";
import { useApp } from "./app-provider";

type Preview = {
  draftId: string;
  source: Source;
  idea: GeneratedDraft;
  mode: string;
  warning: string;
};
export function Ingest() {
  const { request, busy, aiMode } = useApp();
  const router = useRouter();
  const [kind, setKind] = useState<"text" | "url">("text");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [author, setAuthor] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [topics, setTopics] = useState("");
  async function generate() {
    const response = await request(
      "/api/ingest",
      kind === "url" ? { kind, url } : { kind, title, text, url, author },
    );
    if (response) {
      const data = response as unknown as Preview;
      setPreview(data);
      setDraftTitle(data.idea.title);
      setTopics(data.idea.topics.join(", "));
    }
  }
  async function commit() {
    const response = await request("/api/ingest", {
      action: "commit",
      draftId: preview!.draftId,
      title: draftTitle,
      topics: topics
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
    if (response?.ideaId) router.push(`/idea/${response.ideaId}`);
  }
  return (
    <div className="ingest-page">
      <div className="page-heading">
        <p className="eyebrow">BRING SOMETHING WORTH READING</p>
        <h1>Add a source.</h1>
        <p>
          Preserve the original. Review the idea. Decide whether it belongs in
          your collection.
        </p>
      </div>
      {preview ? (
        <div className="ingest-review">
          <div className="review-label">
            <span className="eyebrow">PREVIEW · NOTHING SAVED YET</span>
            <span className="mode-pill">
              {preview.mode === "demo" ? "Source extract" : "AI interpretation"}
            </span>
          </div>
          <label className="field">
            Idea title
            <input
              value={draftTitle}
              maxLength={200}
              onChange={(event) => setDraftTitle(event.target.value)}
            />
          </label>
          <p className="idea-thesis">{preview.idea.oneSentence}</p>
          <p className="explanation">{preview.idea.shortExplanation}</p>
          <label className="field">
            Topics (up to 5, separated by commas)
            <input
              value={topics}
              onChange={(event) => setTopics(event.target.value)}
            />
          </label>
          <details open>
            <summary>Supporting source extract</summary>
            <blockquote>{preview.idea.evidence}</blockquote>
          </details>
          <details>
            <summary>Inspect the full preserved source</summary>
            <p className="source-text">{preview.source.rawText}</p>
          </details>
          <p className="microcopy">
            {preview.warning} A new source starts with a conservative
            source-quality estimate of 0.60.
          </p>
          <p className="microcopy">
            Preview expires after 30 minutes or a server restart.
          </p>
          <div className="button-row">
            <button
              className="primary"
              disabled={busy || !draftTitle.trim() || !topics.trim()}
              onClick={() => void commit()}
            >
              Save reviewed idea →
            </button>
            <button disabled={busy} onClick={() => setPreview(null)}>
              Discard preview
            </button>
          </div>
        </div>
      ) : (
        <div className="ingest-form">
          <div className="segmented">
            <button
              aria-pressed={kind === "text"}
              onClick={() => setKind("text")}
            >
              Paste text
            </button>
            <button
              aria-pressed={kind === "url"}
              onClick={() => setKind("url")}
            >
              Import a URL
            </button>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void generate();
            }}
          >
            {kind === "text" && (
              <>
                <label className="field">
                  Source title
                  <input
                    required
                    minLength={3}
                    maxLength={200}
                    placeholder="A title you can find again"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <label className="field">
                  Source text
                  <textarea
                    required
                    minLength={120}
                    maxLength={100000}
                    className="source-input"
                    placeholder="Paste at least 30 words of an explanation, essay, or article…"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                  />
                </label>
                <label className="field">
                  Author (optional)
                  <input
                    maxLength={200}
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                  />
                </label>
              </>
            )}
            <label className="field">
              {kind === "url" ? "Public article URL" : "Source URL (optional)"}
              <input
                type="url"
                required={kind === "url"}
                placeholder="https://…"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </label>
            <button className="primary full" disabled={busy}>
              {busy ? "Preparing preview…" : "Create a reviewable draft"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="microcopy">
            {aiMode === "demo"
              ? "Demo mode keeps a source extract. No API key required."
              : "This requested source is sent to OpenAI to draft one grounded idea."}
          </p>
          <p className="microcopy">
            URL extraction handles public HTML articles and plain text. Blocked
            pages and paywalls fail cleanly; paste text you can legitimately
            access.
          </p>
        </div>
      )}
    </div>
  );
}
