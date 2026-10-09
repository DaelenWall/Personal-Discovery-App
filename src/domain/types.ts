export type Source = {
  id: string;
  type: "url" | "pasted_text" | "seed";
  title: string;
  url?: string;
  author?: string;
  publisher?: string;
  publishedAt?: string;
  rawText: string;
  createdAt: string;
};

export type Idea = {
  id: string;
  sourceId: string;
  title: string;
  oneSentence: string;
  shortExplanation: string;
  deeperExplanation?: string;
  whyItMatters?: string;
  example?: string;
  counterpoint?: string;
  concepts: string[];
  topics: string[];
  sourceQuality: number;
  depthScore: number;
  createdAt: string;
  interpretation: "editorial" | "source_extract" | "ai";
  supportingExcerpt?: string;
  recall?: {
    question: string;
    options: string[];
    answer: number;
    keywords: string[];
  };
};

export type UserIdeaState = {
  ideaId: string;
  status: "unseen" | "seen" | "saved" | "known" | "dismissed" | "learning";
  saved?: boolean;
  interestScore?: number;
  userNote?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  timesSeen: number;
};

export type ConceptState = {
  concept: string;
  familiarity: number;
  confidence: number;
  lastEncounteredAt?: string;
  lastRecalledAt?: string;
  successfulRecalls: number;
  failedRecalls: number;
};

export type EventType =
  | "card_view"
  | "save"
  | "dismiss"
  | "mark_known"
  | "more_like_this"
  | "deep_dive"
  | "source_open"
  | "ask"
  | "recall_shown"
  | "recall_answered"
  | "session_extend"
  | "session_end"
  | "time_budget_reached"
  | "time_reminder_dismissed"
  | "enough_triggered";
export type InteractionEvent = {
  id: string;
  sessionId: string;
  ideaId?: string;
  type: EventType;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type EnoughResult = {
  triggered: boolean;
  reason?: "rapid_skim" | "passive_run";
  fastViews: number;
  medianDwell: number;
  recentViews: number;
};

export type Session = {
  id: string;
  startedAt: string;
  segmentStartedAt?: string;
  segmentStartIndex?: number;
  endedAt?: string;
  contractType: "time" | "cards";
  contractValue: number;
  topicFocus: string[];
  extensionCount: number;
  enoughTriggered: boolean;
  status: "active" | "enough" | "ended";
  endReason?: "contract" | "batch" | "manual" | "enough";
  ideaIds: string[];
  currentIndex: number;
  currentDwellSeconds: number;
  lastActivityAt: string;
  deadline?: string;
  timeBudgetExpiredAt?: string;
  timeReminderDismissedAt?: string;
  cardLimit: number;
  enoughWindowStart: string;
  recallIdeaId?: string;
  recallCompleted?: boolean;
  recallOffered: boolean;
  ranking: Record<string, ScoreBreakdown>;
};

export type ScoreBreakdown = {
  interest: number;
  novelty: number;
  depth: number;
  sourceQuality: number;
  connection: number;
  diversity: number;
  total: number;
  reason: string;
};

export type Settings = {
  defaultMinutes: number;
  enoughSensitivity: "conservative" | "balanced";
  topicWeights: Record<string, number>;
  theme: "system" | "light" | "dark";
};

export type Store = {
  schemaVersion: 1;
  sources: Source[];
  ideas: Idea[];
  states: UserIdeaState[];
  concepts: ConceptState[];
  sessions: Session[];
  events: InteractionEvent[];
  settings: Settings;
};

export const TOPICS = [
  "Philosophy",
  "Psychology",
  "AI",
  "Computer science",
  "Science",
  "Economics",
  "History",
  "Creativity",
  "Decision-making",
  "Systems thinking",
  "Technology",
  "Sociology",
  "Biology",
  "Mathematics",
  "Design",
];
export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
