import type { EnoughResult, InteractionEvent, Settings } from "./types";

export const MEANINGFUL = new Set([
  "save",
  "more_like_this",
  "deep_dive",
  "source_open",
  "ask",
  "recall_answered",
  "mark_known",
]);

export function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function evaluateEnough(
  events: InteractionEvent[],
  now: string,
  windowStart: string,
  sensitivity: Settings["enoughSensitivity"] = "conservative",
): EnoughResult {
  const window = events.filter((event) => event.createdAt >= windowStart);
  const views = window.filter((event) => event.type === "card_view");
  const recent = views.slice(-12);
  const lastMeaningful = [...window]
    .reverse()
    .find((event) => MEANINGFUL.has(event.type));
  const meaningfulAt = lastMeaningful?.createdAt ?? windowStart;
  let fastViews = 0;
  for (let index = views.length - 1; index >= 0; index--) {
    const view = views[index];
    if (
      (Number(view.metadata?.dwellSeconds) || 0) >= 4 ||
      (lastMeaningful && view.createdAt <= meaningfulAt)
    )
      break;
    fastViews++;
  }
  const medianDwell = median(
    recent.map((event) => Number(event.metadata?.dwellSeconds) || 0),
  );
  const threshold = sensitivity === "balanced" ? 8 : 10;
  const rapidSkim = fastViews >= threshold && medianDwell < 4;
  const noActionMinutes = (Date.parse(now) - Date.parse(meaningfulAt)) / 60_000;
  const recentFiveMinutes = views.filter(
    (event) => Date.parse(now) - Date.parse(event.createdAt) <= 300_000,
  );
  const passiveRun =
    noActionMinutes >= 8 && recentFiveMinutes.length >= 10 && medianDwell < 6;
  return {
    triggered: rapidSkim || passiveRun,
    reason: rapidSkim ? "rapid_skim" : passiveRun ? "passive_run" : undefined,
    fastViews,
    medianDwell,
    recentViews: recent.length,
  };
}
