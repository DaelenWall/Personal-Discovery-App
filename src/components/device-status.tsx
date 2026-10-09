"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useApp } from "./app-provider";

const subscribeConnection = (update: () => void) => {
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
};

export function DeviceStatus() {
  const { isPhone } = useApp();
  const online = useSyncExternalStore(
    subscribeConnection,
    () => navigator.onLine,
    () => true,
  );
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!isPhone) return;
    let canceled = false;
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker
        .register("/phone-sw.js", { scope: "/phone" })
        .then(async () => {
          const worker = await navigator.serviceWorker.ready;
          if (!navigator.serviceWorker.controller)
            await new Promise<void>((resolve) =>
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => resolve(),
                { once: true },
              ),
            );
          const paths = [
            ...document.querySelectorAll<HTMLScriptElement>("script[src]"),
          ]
            .map((script) => script.src)
            .concat(
              [
                ...document.querySelectorAll<HTMLLinkElement>(
                  'link[rel="stylesheet"]',
                ),
              ].map((link) => link.href),
            );
          const channel = new MessageChannel();
          channel.port1.onmessage = (event) => {
            if (!canceled) setReady(Boolean(event.data.ready));
          };
          worker.active?.postMessage({ type: "CACHE_PHONE", paths }, [
            channel.port2,
          ]);
        })
        .catch(() => {
          if (!canceled) setReady(false);
        });
    }
    const viewport = window.visualViewport;
    function keyboard() {
      const editable = /^(INPUT|TEXTAREA)$/.test(
        document.activeElement?.tagName ?? "",
      );
      document.documentElement.dataset.keyboard =
        editable && viewport && window.innerHeight - viewport.height > 120
          ? "open"
          : "closed";
    }
    viewport?.addEventListener("resize", keyboard);
    document.addEventListener("focusin", keyboard);
    document.addEventListener("focusout", keyboard);
    return () => {
      canceled = true;
      viewport?.removeEventListener("resize", keyboard);
      document.removeEventListener("focusin", keyboard);
      document.removeEventListener("focusout", keyboard);
      delete document.documentElement.dataset.keyboard;
    };
  }, [isPhone]);
  if (!isPhone) return null;
  return (
    <div className="device-status" role="status">
      <span>
        PRIVATE BETA ·{" "}
        {online
          ? ready
            ? "Ready for offline reading"
            : "Preparing offline reading…"
          : "Offline · reading stays on this device"}
      </span>
      <details>
        <summary>iPhone installation</summary>
        <p>
          In Safari, use Share → Add to Home Screen → Open as Web App. Open the
          installed app while connected once, and wait for “Ready for offline
          reading.”
        </p>
        <p>
          Reading, saves, notes, recall, and sessions work offline. New AI
          answers and URL extraction need your Mac service; source material
          remains available on this device.
        </p>
      </details>
    </div>
  );
}
