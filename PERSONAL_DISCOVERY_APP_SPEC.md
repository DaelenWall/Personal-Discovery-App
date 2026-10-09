# Personal Discovery App — Codex Handoff

## 0. What this is

Current user direction (October 6, 2026): iPhone is the intended personal-use launch device, with no public distribution. The web V1 proves the product loop; private phone access and installation must be completed before personal launch. Timed sessions must allow finishing the current idea: show a dismissible deadline reminder and end only when moving to the next feed idea. Deep dives and questions on the current topic remain available.

Beta clarification (October 6, 2026): prepare a private iPhone beta. A Home Screen web app with on-device reading data, offline sessions, explicit JSON transfer, and paired private HTTPS access is the chosen first installation route. Optional AI remains on the Mac; it is not required for reading. Actual certificate trust, Home Screen installation, and device acceptance checks must be performed on the user's iPhone.

Build a **single-user, personal intellectual discovery app** inspired by the useful parts of Deepstash, but designed around depth, personalization, memory, source quality, and deliberate anti-addiction mechanics.

This is **not** a social network, commercial content platform, or engagement-maximization product.

The core loop is:

**discover → understand → connect → recall → stop**

The app should help the user encounter ideas they are likely to care about but probably do not already know, explore them at increasing levels of depth, connect them to prior knowledge, and then intentionally end the session before discovery degrades into mindless scrolling.

Working product description:

> A personalized discovery engine that learns what you know, finds things worth knowing, lets you interrogate them deeply, and deliberately prevents discovery from turning into another dopamine feed.

The product is for **one user only**. Optimize for usefulness, clarity, and maintainability over scale.

---

# 1. Product principles

These are hard constraints unless the user explicitly changes them later.

## 1.1 Personalization over popularity
Do not rank content because it is trending or broadly popular. Rank it based on:
- inferred user interest
- novelty relative to what the user has already seen/learned
- depth / conceptual richness
- source quality
- connection to existing knowledge
- diversity / serendipity

A conceptual ranking function can start as:

`score = interest × novelty × depth × source_quality × connection_value`

The exact formula can evolve, but **engagement time must not be the primary optimization target**.

## 1.2 Compression is the entry point, not the product
A short idea card should make an idea accessible, but the user must be able to progressively go deeper:

- 30-second idea
- 2-minute explanation
- deeper explanation / examples
- source material
- conversation / interrogation
- related concepts

Avoid shallow “quote card” content.

## 1.3 Finite feed by design
No infinite scroll.

A session has a defined boundary:
- a time budget, such as 5 / 10 / 20 minutes
- or a finite card budget, such as 5 / 10 / 15 ideas

The user should always know roughly how much remains.

## 1.4 The app should sometimes tell the user to leave
The app is allowed to conclude:

> You are no longer learning. Stop scrolling.

That is a feature.

## 1.5 No dark patterns
Do not add:
- streaks
- XP
- gems
- daily rewards
- FOMO notifications
- follower counts
- likes
- trending tabs
- “you’ll lose your streak” language
- pull-to-refresh randomness
- autoplay
- endless feed
- manipulative countdowns

## 1.6 Source-grounded
Generated explanations should preserve source attribution. When possible, every content item should retain:
- source title
- source URL
- author / publisher if available
- publication date if available
- extracted text or relevant excerpt
- generated summary
- model-generated concepts/tags

The system should distinguish source text from AI interpretation.

## 1.7 User control
AI may suggest:
- tags
- related concepts
- what the user might already know
- deeper explanations
- recall prompts

But the user can correct preferences, mark material as already known, dismiss content, or change topic weights.

---

# 2. V1 goal

Build a polished local-first web app that proves the complete core loop:

1. User opens app.
2. User chooses a session contract.
3. App presents a finite personalized feed of idea cards.
4. User can save, dismiss, mark known, go deeper, or ask a question.
5. App periodically inserts a lightweight recall prompt.
6. App tracks interaction patterns during the session.
7. If the session degrades into rapid passive swiping, the app triggers **Enough**.
8. At the planned end, feed stops.
9. App shows a short session summary and encourages the user to leave or intentionally extend.
10. Future sessions use prior behavior to improve ranking.

V1 does **not** need commercial-grade ingestion, perfect recommendations, or native mobile apps.

---

# 3. Recommended technical approach

Use a straightforward, modern TypeScript stack.

## Frontend / full stack
- Next.js with App Router
- TypeScript
- Tailwind CSS
- minimal component library if useful
- responsive mobile-first UI

## Persistence
Prefer local-first simplicity for the first working version.

Recommended:
- SQLite
- Drizzle ORM or Prisma

Use a clean repository/data-access layer so persistence can later be swapped to Supabase/Postgres without rewriting business logic.

## AI
Create an abstraction such as:

`AIProvider`

Capabilities:
- summarize source
- generate idea card
- generate deeper explanation
- extract concepts/tags
- generate recall question
- evaluate free-text recall approximately
- answer user questions grounded in source + stored context

Use the latest stable official OpenAI SDK available in the environment if an API key is supplied.

Environment variable:
`OPENAI_API_KEY`

Do not hardcode a specific model name throughout the codebase. Put model configuration in one place.

If no API key exists, provide a **mock/demo mode** with seeded content so the full UX can still be tested.

## Content ingestion
V1 should support:
1. manually pasted text
2. manually pasted URL
3. seeded/demo content

For URL ingestion:
- fetch server-side
- extract readable article text when technically possible
- preserve the URL and metadata
- fail cleanly when a site blocks extraction

Do not bypass paywalls or access controls.

RSS / YouTube / PDFs can be later milestones.

---

# 4. Information architecture

Primary areas:

## Home / Session Start
Purpose: begin intentionally, not reflexively.

Show:
- “What do you want from this session?”
- time contract: 5 / 10 / 20 min / custom
- optional card contract: 5 / 10 / 15 ideas
- topic focus:
  - mixed
  - philosophy
  - psychology
  - AI
  - science
  - economics
  - technology
  - history
  - creativity
  - user-created topics

A lightweight option:
- “Surprise me, but make it worth it.”

Start button should explicitly state the contract:
`Start 10-minute session`

## Discover
Finite card feed.

Must show progress:
- `3 of 10`
or
- `7 min left`

Card actions:
- Save
- Already know this
- Not interested
- More like this
- Go deeper
- Ask
- Source

Do not include public social metrics.

## Deep Dive
Progressive depth.

Suggested sections:
- concise explanation
- why it matters
- concrete example
- counterpoint / limitation
- related concepts
- original source
- ask a question

## Ask
Contextual chat focused on the current idea.

The assistant should receive:
- current idea
- source excerpt
- related stored concepts
- user-known status
- relevant saved ideas

The assistant should prefer grounded explanations and clearly separate source claims from interpretation.

## Library
Saved ideas.

Filters:
- topic
- source
- learned / exploring
- saved date
- favorites if desired

Allow user notes.

## Knowledge
A lightweight knowledge map/list showing:
- concepts encountered
- concepts marked known
- concepts successfully recalled
- related concepts
- topics receiving high/low interest

V1 can be a list instead of a graph visualization.

## Settings
- default session length
- Enough sensitivity
- topic weights
- data export
- delete local data
- AI provider configuration
- anti-addiction settings

---

# 5. Core object model

Use stable IDs and timestamps.

## Source
```ts
type Source = {
  id: string
  type: "url" | "pasted_text" | "seed"
  title: string
  url?: string
  author?: string
  publisher?: string
  publishedAt?: string
  rawText: string
  createdAt: string
}
```

## Idea
```ts
type Idea = {
  id: string
  sourceId: string
  title: string
  oneSentence: string
  shortExplanation: string
  deeperExplanation?: string
  whyItMatters?: string
  counterpoint?: string
  concepts: string[]
  topics: string[]
  sourceQuality: number // 0..1
  depthScore: number // 0..1
  createdAt: string
}
```

## UserIdeaState
```ts
type UserIdeaState = {
  ideaId: string
  status: "unseen" | "seen" | "saved" | "known" | "dismissed" | "learning"
  interestScore?: number
  userNote?: string
  firstSeenAt?: string
  lastSeenAt?: string
  timesSeen: number
}
```

## ConceptState
```ts
type ConceptState = {
  concept: string
  familiarity: number // 0..1
  confidence: number // 0..1
  lastEncounteredAt?: string
  lastRecalledAt?: string
  successfulRecalls: number
  failedRecalls: number
}
```

## Session
```ts
type Session = {
  id: string
  startedAt: string
  endedAt?: string
  contractType: "time" | "cards"
  contractValue: number
  topicFocus?: string[]
  extensionCount: number
  enoughTriggered: boolean
}
```

## InteractionEvent
Append-only event stream.

```ts
type InteractionEvent = {
  id: string
  sessionId: string
  ideaId?: string
  type:
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
    | "enough_triggered"
  createdAt: string
  metadata?: Record<string, unknown>
}
```

Track view duration either in metadata or a dedicated field.

---

# 6. Personalized ranking

V1 should be understandable and inspectable, not a black box.

For each candidate idea calculate:

- `interest`: similarity to positively weighted topics / saved ideas
- `novelty`: penalize concepts already highly familiar
- `depth`: favor ideas with useful explanatory richness
- `sourceQuality`: manually seeded or heuristically estimated
- `connection`: reward useful links to existing knowledge
- `diversity`: penalize showing too many near-identical ideas in a row

Example:

```ts
score =
  0.30 * interest +
  0.25 * novelty +
  0.15 * depth +
  0.15 * sourceQuality +
  0.10 * connection +
  0.05 * diversity
```

This is only an initial heuristic.

Important:
- do not optimize for total session duration
- do not reward repeated opening of the app
- do not treat rapid swiping as positive engagement

Explicit feedback should carry more weight than passive behavior:
- saved / deep dive / asked question = strong positive
- “more like this” = very strong positive
- “already know” = topic may still be interesting, but novelty should drop
- “not interested” = negative
- rapid dismissal = weak negative unless repeated

---

# 7. Session Contract

This is a first-class feature.

When entering the app, the user should consciously choose the boundary of the session.

Default screen:

> How much attention are you giving this?

Options:
- 5 min
- 10 min
- 20 min
- 5 ideas
- 10 ideas
- custom

The contract is visible but unobtrusive during the session.

At roughly 75–80% completion:
> 2 minutes left in this session.

Do not make this dramatic.

At 100%:
- for a time contract, show a small dismissible reminder: `Your allotted time has run out.`
- let the user finish the current idea, deep dive, source reading, questions, notes, and any pending recall
- end the session when the user requests the next feed idea, without revealing that new idea; then show the session summary
- for a card contract, stop at the card boundary and show the session summary
- user may leave
- or intentionally extend

Extension options:
- +5 min
- +3 ideas
- “Go deeper on one thing instead”

Do not provide a frictionless “keep scrolling” button.

---

# 8. Anti-feed mechanics

These are mandatory.

## 8.1 Finite batch
Generate/select the batch at session start.

Do not continuously append content.

## 8.2 No pull-to-refresh reward
Refreshing the page should not generate a random new jackpot feed.

## 8.3 Visible boundary
Always expose remaining time/cards.

## 8.4 No engagement gamification
No streaks, badges, XP, levels, leaderboards, or daily reward mechanics.

## 8.5 No manipulative notifications
V1 needs no push notifications.

If reminders are later added, they must be user-scheduled and utilitarian.

---

# 9. Quick Recall

Purpose: detect whether the user is learning rather than merely consuming.

Do not turn this into schoolwork.

After roughly 4–6 substantive ideas, optionally insert a recall card.

Examples:

> Earlier you read about survivorship bias. Explain it in one sentence.

> Which of these best captures the idea you saw earlier?

> You saved three ideas about decision-making. Which one can you still explain without reopening it?

Recall can be:
- free text
- simple multiple choice
- “I don’t remember”

For free-text evaluation:
- tolerate paraphrase
- return a lightweight result: `got it`, `partly`, `missed`
- never shame the user

A successful recall should increase concept familiarity/confidence.

A failed recall should make the idea eligible for later resurfacing.

Do not insert recall too frequently.

---

# 10. Enough

**Enough** is the anti-addiction intervention.

It should trigger when evidence suggests the user has shifted from deliberate reading into automatic scrolling.

## Initial heuristic

Maintain rolling session metrics:
- median dwell time on last N cards
- consecutive cards under a minimum dwell threshold
- time since last meaningful action
- number of deep dives
- saves
- questions asked
- source opens
- recall responses
- dismiss rate
- contract overrun

Start conservative. False positives are annoying.

Example trigger candidates:
- 8+ consecutive cards with < 4 seconds dwell
- no meaningful action for 8+ minutes AND rapid card progression
- 12+ cards viewed in a short interval with almost no reading
- session contract exceeded plus clear skim behavior

Use multiple signals rather than one threshold.

Pseudo-logic:

```ts
const rapidSkim =
  consecutiveFastViews >= 8 &&
  medianRecentDwellSeconds < 4

const passiveRun =
  minutesSinceMeaningfulAction >= 8 &&
  recentCardsViewed >= 10

const overContract =
  contractExceeded &&
  recentMeaningfulActions === 0

if (rapidSkim || passiveRun || overContract) {
  triggerEnough()
}
```

## Enough screen

Tone: direct, factual, non-moralizing.

Example:

> ## Enough.
>
> You’ve viewed 14 cards in the last few minutes and haven’t opened a source, saved an idea, or gone deeper.
>
> This looks more like scrolling than learning.

Actions:
- `Pick one idea to go deeper on`
- `End session`
- `Continue for 5 minutes`

If continuing:
- require explicit selection
- record extension
- avoid guilt language

Another possible message:

> You planned 20 minutes. You’re 6 minutes over, and your last 11 cards averaged 3 seconds each.

The app should call out observable behavior, not speculate about the user’s character or mental state.

---

# 11. Session Summary

When the contract ends or the user exits:

Show only useful information.

Example:

> **12-minute session**
>
> 8 ideas read\
> 2 saved\
> 1 deep dive\
> 1 source opened\
> 1 concept recalled successfully

Then:

### Worth keeping
- Bayesian surprise
- Goodhart’s law

### One thing to remember
A generated one-sentence synthesis.

Primary CTA:
`Done`

Secondary:
`Go deeper on one saved idea`

Do not end with:
- streak progress
- “come back tomorrow”
- reward animations
- engagement bait

---

# 12. Content card design

Each card should feel substantial enough to justify attention.

Minimum card:

**Title**

One-sentence idea.

Short explanation: roughly 60–140 words.

Small metadata:
- topic
- source
- estimated depth / reading time if useful

Actions:
- Save
- Known
- Not for me
- Go deeper
- Ask
- Source

Avoid TikTok/Reels visual language.

No auto-advancing.

Keyboard support on desktop is welcome, but swiping should not become the dominant UX metaphor.

---

# 13. Deep Dive design

When “Go deeper” is selected, progressively reveal:

1. Clear explanation
2. Mechanism / why this happens
3. Concrete example
4. Limitation / counterargument
5. Related concepts
6. Source

Example for confirmation bias:
- definition
- cognitive mechanisms
- example in scouting / investing / politics
- when “confirmation bias” itself becomes an overused explanation
- relation to Bayesian updating, motivated reasoning, belief perseverance

The app should encourage understanding, not just add more words.

---

# 14. Knowledge memory

The app should remember what the user likely knows.

Signals:
- “already know this”
- successful recall
- repeated successful engagement
- explicit familiarity rating
- asking advanced follow-up questions

Concept familiarity should affect future ranking.

If familiarity is high:
- do not repeatedly show beginner definitions
- show more advanced or adjacent ideas
- occasionally use known concepts as anchors for explaining new concepts

Example:

> This is similar to Goodhart’s law, which you already know, except...

This memory is one of the major advantages of a single-user product.

---

# 15. Topic profile

Seed topics:

- Philosophy
- Psychology
- AI
- Computer science
- Science
- Economics
- History
- Creativity
- Decision-making
- Systems thinking
- Technology
- Sociology
- Biology
- Mathematics
- Design

Allow custom topics.

Each topic can have a preference weight from -1 to +1.

Learn weights slowly from explicit actions.

Do not overfit after one click.

---

# 16. Source ingestion pipeline

Pipeline:

`source → extraction → segmentation → idea generation → concept tagging → quality checks → persistence`

## Pasted text
User pastes text and optional title/source.

## URL
Server fetches URL.

Try readable extraction.

Store:
- URL
- title
- author/publisher if discoverable
- article text

Then generate one or more ideas.

## Quality checks
Reject / flag cards that:
- cannot be supported by source text
- are near duplicates
- are generic motivational filler
- contain suspiciously specific unsupported facts
- have no meaningful explanatory value

Store provenance so a user can inspect what the generated idea came from.

---

# 17. Seed/demo content

The app must work before live ingestion or AI setup.

Include a small high-quality seed dataset across several topics.

At least 20–30 ideas.

Suggested concepts:
- Goodhart’s law
- survivorship bias
- Bayesian updating
- map vs territory
- Ship of Theseus
- falsifiability
- opportunity cost
- sunk cost
- regression to the mean
- path dependence
- emergence
- tragedy of the commons
- second-order effects
- exploration vs exploitation
- predictive processing
- availability heuristic
- base-rate neglect
- signaling
- loss aversion
- antifragility
- principal-agent problem
- Lindy effect
- steelmanning
- Chesterton’s fence
- network effects

Seed data should be original paraphrasing, not copied protected summaries.

---

# 18. V1 screens

Implement these screens first:

1. `/`
   - session contract
   - topic selection
   - start

2. `/session/[id]`
   - finite feed
   - progress
   - interactions
   - recall insertion
   - Enough handling

3. `/idea/[id]`
   - deep dive
   - source
   - ask panel

4. `/library`
   - saved ideas
   - filters
   - notes

5. `/knowledge`
   - concepts + familiarity

6. `/settings`
   - defaults
   - Enough sensitivity
   - topic weights
   - AI configuration status
   - export/reset

7. `/ingest`
   - paste URL
   - paste text
   - inspect generated ideas before saving

---

# 19. Visual direction

Aim for:
- calm
- clean
- text-forward
- modern
- dark and light mode
- generous spacing
- excellent typography
- minimal animation
- no noisy gradients unless subtle
- no gamified visual effects

The app should feel closer to a thoughtful reading tool than a social feed.

Mobile-first, but desktop should be excellent.

Important:
- readable line length
- strong hierarchy
- accessible contrast
- clear focus states
- reduced-motion support

---

# 20. Behavior that should feel intentionally different from social media

Bad:
- open app → immediate random feed
- scroll until bored
- refresh for novelty
- app celebrates time spent
- app tries to pull user back

Desired:
- open app → choose intent
- finite material
- interact deliberately
- app notices low-quality consumption
- session ends
- user leaves with one or two ideas worth retaining

---

# 21. Privacy and data

Single-user personal app.

Prefer local storage / local DB for behavioral data.

Do not add analytics SDKs in V1.

Provide export:
- JSON export of sources, ideas, states, concepts, sessions, and events

Provide reset:
- clear all local data after explicit confirmation

Do not send unnecessary behavioral telemetry to external services.

Only send context required for requested AI operations.

---

# 22. Out of scope for V1

Do not spend time on:
- subscriptions
- payments
- public accounts
- social profiles
- followers
- likes
- comments
- public sharing platform
- creator tooling
- app-store packaging
- native iOS/Android
- massive web crawler
- paywall circumvention
- complex vector infrastructure
- perfect recommendation ML
- production-scale auth
- multi-user permissions

Embeddings/vector search can be added later if needed.

Start with straightforward relational storage and simple similarity/tag logic.

---

# 23. Build order

## Phase 1 — Skeleton
- initialize app
- database
- seed dataset
- session contract
- finite feed
- save / known / dismiss
- session completion

## Phase 2 — Anti-addiction
- interaction event tracking
- dwell tracking
- Enough heuristic
- contract warnings
- extension flow
- session summary

## Phase 3 — Learning
- concept state
- quick recall
- familiarity updates
- knowledge screen

## Phase 4 — Depth
- deep dive screen
- related concepts
- contextual Ask
- source provenance

## Phase 5 — Ingestion
- paste text
- URL extraction
- AI card generation
- generation review screen

## Phase 6 — Personalization
- ranking heuristic
- topic weights
- novelty
- diversity
- connection scoring
- inspectable recommendation reason

Example:
`Shown because: high interest in decision-making + related to Bayesian updating + low familiarity`

---

# 24. Acceptance criteria

The V1 is successful when all of the following work.

## Session
- user can start a 10-minute or 10-card session
- feed is finite
- progress is visible
- user cannot accidentally fall into an infinite feed

## Interaction
- save works
- known works
- not interested works
- deep dive works
- source attribution is preserved

## Recall
- at least one recall prompt can appear during an eligible session
- answer is recorded
- concept familiarity updates

## Enough
Given test events representing:
- 10+ rapid card views
- low dwell
- no meaningful interaction

the system triggers Enough.

Given normal reading behavior:
- reasonable dwell
- occasional saves/deep dives

Enough should not trigger.

## End
When contract is reached:
- no additional feed items are silently appended
- timed sessions show a dismissible reminder, preserve the current idea and its deeper material, and show the summary upon the next feed advance
- card sessions show the summary at their card boundary
- serving more feed ideas requires an explicit extension

## Persistence
After restart:
- saved items remain
- knowledge state remains
- topic preferences remain
- session history remains

## Demo
App works without an AI API key using seed content.

---

# 25. Tests

At minimum write tests for:

- recommendation score calculation
- finite session batch creation
- session contract completion
- Enough heuristic positive case
- Enough heuristic negative case
- concept familiarity update after recall
- explicit feedback changes topic preference in expected direction
- persistence/repository behavior
- ingestion validation
- duplicate idea detection if implemented

Add a small end-to-end happy-path test if practical:

`start session → view cards → save → recall → end → summary`

---

# 26. Important UX copy

Use direct copy.

## Session start
> How much attention are you giving this?

## 80% warning
> 2 minutes left in this session.

## Contract complete
> That’s the session you planned.

## Enough
> Enough.

> You’ve moved through 14 cards quickly and haven’t saved, opened a source, asked a question, or gone deeper.

> This looks more like scrolling than learning.

Buttons:
- Pick one idea to go deeper on
- End session
- Continue for 5 minutes

## Session end
> You read 8 ideas. Two were worth keeping.

Avoid fake encouragement and wellness-speak.

---

# 27. Engineering standards

- strict TypeScript
- clear domain types
- keep recommendation logic in pure functions where possible
- isolate persistence behind repositories
- isolate AI behind provider interface
- append-only interaction events
- do not bury core logic inside React components
- descriptive names
- small modules
- useful comments only
- no premature microservices
- no unnecessary abstraction
- no giant dependency pile
- linting and formatting configured
- README with setup instructions
- `.env.example`
- seed command
- test command

Prefer correctness and inspectability over cleverness.

---

# 28. Future ideas — not V1 requirements

Keep architecture open to these, but do not build them yet:

- RSS subscriptions
- YouTube transcript ingestion
- PDF / paper ingestion
- browser share extension
- semantic embeddings
- concept graph visualization
- resurfacing / spaced repetition
- “teach me something adjacent to X”
- contradiction finder
- compare two ideas
- source-quality scoring using domain reputation
- daily curated packet
- expanded offline capabilities beyond the private Home Screen beta
- native share sheet
- user-defined “rabbit hole” sessions
- deliberate serendipity mode
- local LLM support
- advanced personal knowledge graph

---

# 29. The most important product constraint

If forced to choose between:

A. making the user spend more time in the app\
B. helping the user get value and leave

choose **B**.

This must remain true even when designing recommendations, session flow, notifications, recall, or metrics.

Success is not “minutes consumed.”

A better internal success measure is something like:

- meaningful ideas saved
- deep dives initiated
- sources opened
- recall success
- diversity of concepts encountered
- user-reported usefulness
- low rate of unintentional session extension

---

# 30. Codex implementation instruction

Treat this document as the current product source of truth.

Do not redesign the concept into a generic content-feed app.

Start by inspecting the repository. If it is empty, initialize the project using the recommended architecture above.

Build the smallest coherent vertical slice first:

`session contract → finite seeded feed → interaction tracking → Enough → session summary → persistence`

Make it actually runnable before adding AI ingestion.

After the vertical slice works, proceed through the phases in Build Order.

When choosing between a sophisticated implementation and a simpler implementation that preserves the product behavior, choose the simpler one.

Keep a `DECISIONS.md` file for material architectural decisions or assumptions.

Keep a `TODO.md` containing only concrete unfinished work.

If a requirement is ambiguous, make the most conservative reasonable assumption, document it in `DECISIONS.md`, and continue. Do not stop progress for trivial product questions.

Before declaring the build complete:
- run tests
- run lint
- run typecheck
- exercise the main session flow
- verify persistence across restart
- verify Enough does not fire during normal deliberate reading
- verify the app remains fully usable without an AI key
