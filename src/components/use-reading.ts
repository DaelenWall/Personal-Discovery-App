"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Session } from "@/domain/types";
import { useApp } from "./app-provider";

export function useReading(session: Session | undefined) {
  const { command, isPhone } = useApp();
  const pending = useRef(0);
  const last = useRef(0);
  const visible = useRef(false);
  const collect = useCallback(() => {
    const now = performance.now();
    if (visible.current && last.current)
      pending.current += Math.max(0, now - last.current) / 1000;
    last.current = now;
  }, []);
  const take = useCallback(() => {
    collect();
    const value = pending.current;
    pending.current = 0;
    return Math.min(3600, value);
  }, [collect]);
  const sessionId = session?.id;
  const index = session?.currentIndex;
  const active = session?.status === "active" && !session?.recallIdeaId;
  useEffect(() => {
    last.current = performance.now();
    pending.current = 0;
    visible.current = Boolean(active && document.visibilityState === "visible");
    function onVisibility() {
      collect();
      visible.current = Boolean(
        active && document.visibilityState === "visible",
      );
      if (document.visibilityState === "hidden") flush();
    }
    function flush() {
      if (!sessionId || !active) return;
      if (isPhone) {
        void command({
          type: "tick",
          sessionId,
          expectedIndex: index,
          activeSeconds: take(),
        });
        return;
      }
      navigator.sendBeacon(
        "/api/actions",
        new Blob(
          [
            JSON.stringify({
              type: "tick",
              sessionId,
              expectedIndex: index,
              activeSeconds: take(),
            }),
          ],
          { type: "application/json" },
        ),
      );
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [sessionId, index, active, collect, take, isPhone, command]);
  return take;
}
