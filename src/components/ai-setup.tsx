"use client";

import { useState } from "react";
import { useApp } from "./app-provider";

export function AISetup() {
  const { aiStatus, request, busy } = useApp();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(aiStatus.model);
  const [message, setMessage] = useState("");
  async function configure(action: "save" | "test") {
    const response = await request("/api/ai-settings", {
      action,
      apiKey,
      model,
    });
    if (response?.message) {
      setMessage(String(response.message));
      if (action === "save") setApiKey("");
    }
  }
  return (
    <section className="settings-section" id="ai">
      <h2>Ask & AI provider</h2>
      <p className="provider-status">
        {aiStatus.configured
          ? `OpenAI configured · ${aiStatus.model}`
          : "Connect OpenAI for new answers"}
      </p>
      <p className="section-description">
        Ask sends the current source, your question, and a few related concepts
        to OpenAI. Your reading events stay local.
      </p>
      <label className="field">
        OpenAI API key
        <input
          type="password"
          value={apiKey}
          autoComplete="off"
          spellCheck={false}
          maxLength={512}
          placeholder={
            aiStatus.hasApiKey
              ? "Key saved · leave blank to keep it"
              : "Enter your API key"
          }
          onChange={(event) => {
            setApiKey(event.target.value);
            setMessage("");
          }}
        />
      </label>
      <label className="field">
        OpenAI model
        <input
          value={model}
          autoComplete="off"
          maxLength={200}
          placeholder="Model ID available to your API account"
          onChange={(event) => {
            setModel(event.target.value);
            setMessage("");
          }}
        />
      </label>
      <div className="button-row">
        <button
          className="primary"
          disabled={
            busy || !model.trim() || (!apiKey.trim() && !aiStatus.hasApiKey)
          }
          onClick={() => void configure("save")}
        >
          Save AI setup
        </button>
        <button
          disabled={
            busy || !model.trim() || (!apiKey.trim() && !aiStatus.hasApiKey)
          }
          onClick={() => void configure("test")}
        >
          Test connection
        </button>
      </div>
      {message && (
        <p className="status-message" role="status">
          {message}
        </p>
      )}
      <p className="microcopy">
        The key is stored in a protected file on this Mac, outside your reading
        database and JSON exports. The app never returns the saved key to the
        browser. Saving takes effect immediately.
      </p>
      <a
        className="text-link"
        href="https://platform.openai.com/api-keys"
        target="_blank"
        rel="noreferrer"
      >
        Manage your OpenAI API keys ↗
      </a>
      <p className="microcopy">
        Connection testing checks key and model access. Your first Ask request
        also checks generation availability and account limits.
      </p>
    </section>
  );
}
