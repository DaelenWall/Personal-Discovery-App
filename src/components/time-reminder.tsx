"use client";

import { useEffect, useRef, useState } from "react";
import { timeBudgetReached } from "@/domain/contracts";
import type { Session } from "@/domain/types";
import { useApp } from "./app-provider";

export function TimeReminder({
  session,
  takeActiveSeconds,
}: {
  session: Session | undefined;
  takeActiveSeconds: () => number;
}) {
  const { command, busy } = useApp();
  const segmentKey = session ? `${session.id}:${session.deadline}` : "";
  const [dismissedKey, setDismissedKey] = useState(() => {
    try {
      return typeof window === "undefined"
        ? ""
        : window.localStorage.getItem("commonplace-dismissed-time-reminder") ||
            "";
    } catch {
      return "";
    }
  });
  const attempted = useRef("");
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(new Date().toISOString()),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (
      !session ||
      session.status !== "active" ||
      session.timeReminderDismissedAt ||
      busy ||
      dismissedKey !== segmentKey ||
      attempted.current === segmentKey
    )
      return;
    attempted.current = segmentKey;
    void command({
      type: "dismiss_time_reminder",
      sessionId: session.id,
      expectedIndex: session.currentIndex,
      activeSeconds: takeActiveSeconds(),
    });
  }, [session, busy, command, dismissedKey, segmentKey, takeActiveSeconds]);
  if (
    !session ||
    session.status !== "active" ||
    session.timeReminderDismissedAt ||
    dismissedKey === segmentKey ||
    !timeBudgetReached(session, now)
  )
    return null;
  return (
    <div className="time-reminder" role="status">
      <span>Your allotted time has run out.</span>
      <button
        type="button"
        className="text-button"
        aria-label="Dismiss time reminder"
        onClick={() => {
          // Close immediately even while a question is awaiting its answer.
          setDismissedKey(segmentKey);
          try {
            window.localStorage.setItem(
              "commonplace-dismissed-time-reminder",
              segmentKey,
            );
          } catch {
            /* Server persistence still works when browser storage is unavailable. */
          }
        }}
      >
        ×
      </button>
    </div>
  );
}
