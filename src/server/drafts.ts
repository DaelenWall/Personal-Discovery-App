import type { GeneratedDraft } from "./ai";
import type { Source } from "../domain/types";

export const drafts = new Map<
  string,
  { source: Source; idea: GeneratedDraft; expiresAt: number }
>();
export function pruneDrafts() {
  for (const [id, draft] of drafts)
    if (draft.expiresAt < Date.now()) drafts.delete(id);
}
