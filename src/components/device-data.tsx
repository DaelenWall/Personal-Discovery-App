"use client";

import { useState } from "react";
import { useApp } from "./app-provider";
import { readDeviceSnapshot } from "@/client/repository";

export function DeviceData() {
  const { request, busy } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  async function exportData() {
    const snapshot = await readDeviceSnapshot();
    if (!snapshot) return;
    const exported = new File(
      [JSON.stringify(snapshot.store, null, 2)],
      "commonplace-phone.json",
      { type: "application/json" },
    );
    if (navigator.canShare?.({ files: [exported] })) {
      try {
        await navigator.share({
          files: [exported],
          title: "Commonplace backup",
        });
      } catch {
        /* Canceling the share sheet keeps local data unchanged. */
      }
      return;
    }
    const url = URL.createObjectURL(exported);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exported.name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importData() {
    if (!file || confirm !== "REPLACE DEVICE DATA") return;
    if (file.size > 20_000_000) {
      setMessage("Choose a backup smaller than 20 MB.");
      return;
    }
    try {
      const result = await request("/api/device-import", {
        store: JSON.parse(await file.text()),
      });
      if (result) {
        setMessage("Backup restored on this device.");
        setFile(null);
        setConfirm("");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Could not read this backup: ${error.message}`
          : "This file is not a valid JSON backup.",
      );
    }
  }
  return (
    <div>
      <p className="microcopy">
        Reading data is stored on this device. Export a backup to Files before
        removing the app or clearing Safari data. Mac and device collections are
        separate after the initial copy.
      </p>
      <button onClick={() => void exportData()}>Export device JSON ↓</button>
      <details className="reset-details">
        <summary>Restore a device backup</summary>
        <label className="field">
          JSON backup
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <p>
          Restoring replaces this device’s reading data. AI credentials remain
          on your Mac.
        </p>
        <label className="field">
          Type REPLACE DEVICE DATA
          <input
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </label>
        <button
          disabled={busy || !file || confirm !== "REPLACE DEVICE DATA"}
          onClick={() => void importData()}
        >
          Restore device backup
        </button>
      </details>
      {message && (
        <p className="status-message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
