# Commonplace · Personal Discovery

Commonplace is a personal reading app for discovering an idea, understanding it, saving what matters, and knowing when to stop. Choose a time or idea budget, read a limited collection, and finish with a session summary. Every idea keeps its source information.

**Status:** the private iPhone beta is functional, confirmed by its owner on October 9, 2026. It installs on the iPhone Home Screen and stores reading data on that device. This is a single-user project for personal use.

## What you can do

- Read 25 built-in ideas immediately, without an AI API key.
- Save ideas, mark familiar ones as known, dismiss others, and keep notes.
- Open a deeper explanation, inspect a source, or ask a question about the current idea.
- Review saved ideas in your Library and practice optional recall questions.
- Add accessible source text or a public article URL, review the draft, then save it.
- Adjust topics, appearance, and session defaults in Settings.

There is no endless feed, streak, score, or automatic continuation. **Enough** offers a stopping point when rapid, passive reading suggests that attention is slipping. Continuing requires an explicit choice.

**A time budget never interrupts the current idea.** When time runs out, a small reminder appears. Dismiss it and keep reading, going deeper, asking, or writing notes. Selecting **Next idea** ends the session before showing another idea. Marking known or dismissing a feed idea also advances, so those actions end an expired session too.

## Start on your Mac

You need **Node.js 24 or newer** and npm. Run these commands in the repository folder:

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The app creates its local database and loads the seed ideas automatically. The optional `npm run seed` command also initializes seeds while preserving existing data. SQLite is included with Node; no database service is needed.

Keep the terminal open while using the Mac app. Press **Control-C** to stop it. This desktop address works on the Mac itself; use the private beta service for your iPhone.

## Use the iPhone beta

Keep the Mac and iPhone on the same private Wi-Fi network for initial setup:

```sh
npm run build
npm run beta:prepare
npm run beta:start
```

The terminal prints your private HTTPS address and a pairing code. Follow the [iPhone installation guide](IPHONE_BETA.md) to install and trust this Mac's certificate, pair the phone, and add Commonplace to the Home Screen. Open the installed app while connected and wait for **Ready for offline reading**.

After first installation, normally only `npm run beta:start` is needed. Stop a running service with **Control-C** before restarting it. Rebuild after code updates; repeat preparation after a Wi-Fi address change or before the server certificate expires. An expired pairing code requires a service restart. Each code lasts 30 minutes; existing paired devices retain their access across restarts.

The Mac service is needed for new AI answers and URL extraction. Prepared reading remains available when the Mac is asleep or disconnected.

## What works offline on the iPhone?

| Feature                | Offline behavior                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| Sessions and reading   | Start or resume a limited feed; use Enough, recall, and summaries.                                          |
| Saved ideas and notes  | Read, save, mark known, dismiss, and edit notes on the device.                                              |
| Deep dives and sources | Read stored explanations and preserved source text. Opening an external source website needs a connection.  |
| Ask                    | Retrieve clearly labeled stored explanations. New AI answers need the Mac service and configured AI access. |
| Add a source           | Paste text, review its extract, and save it. Importing a URL needs the Mac service.                         |
| Settings and backups   | Change preferences, export reading data, and restore a JSON backup.                                         |

The phone copies the Mac collection on its first connected opening. After that, **Mac and phone collections are separate**. Changes do not synchronize automatically. Reading data stays in the phone's browser database, including after closing and reopening the app.

## Keep a backup

On the phone, open **Settings → Your local data → Export device JSON** and save the backup to Files. To restore it, choose **Restore a device backup**, select the file, and type `REPLACE DEVICE DATA`. Restoration replaces that device's reading collection; it keeps AI credentials on the Mac.

On the Mac, use **Export JSON** in Settings. Exports contain sources, ideas, notes, knowledge, preferences, sessions, and reading events. They exclude AI credentials.

Export before removing the Home Screen app or clearing Safari data, which can remove device storage. Data deletion requires typing `DELETE MY LOCAL DATA` and restores the seed collection. On the phone, deletion affects only that device.

## Enable new answers in Ask

Reading works without AI setup. For new explanations and follow-up answers:

1. Open **Settings → Ask & AI provider** while connected to the Mac service.
2. Enter your OpenAI API key and a model ID available to your API account.
3. Choose **Save AI setup**, then **Test connection**.
4. Open an idea and ask your question. A real question also checks that response generation is available.

The configuration takes effect immediately. Without it, Ask retrieves existing material and labels the response accordingly. Offline pasted-source drafts preserve an extract for review.

For environment-based setup, copy `.env.example` to `.env.local`, set `OPENAI_API_KEY` and `OPENAI_MODEL`, and restart the service. Settings configuration takes precedence over environment values.

## Where data lives

| Data                                        | Location                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Mac reading collection                      | `data/discovery.sqlite` and its SQLite sidecar files                      |
| iPhone reading collection                   | IndexedDB, the browser database for the installed app's address           |
| Optional AI configuration                   | `data/discovery.sqlite.ai.json`, protected by owner-only file permissions |
| Beta certificates and pairing configuration | `data/beta/`, generated by `beta:prepare`                                 |

Set `DISCOVERY_DB_PATH` in `.env.local` to choose another Mac database path. AI configuration is saved beside that database. Credentials are protected by file permissions rather than encryption, and the app never returns the saved key to the browser.

Personal databases, API configuration, environment files, certificates, and pairing information are excluded from Git. Desktop services bind to the Mac's local address; the beta uses HTTPS and pairing on a private network address. There are no analytics services or push notifications. Reading events support local summaries and Enough; they do not increase ranking scores. Optional AI requests send relevant source/question context to OpenAI, with response storage disabled; reading event history stays local.

## Check the project

```sh
npm run lint
npm run typecheck
npm test
npm run format:check
npm run build
```

For browser and restart checks:

```sh
npx playwright install chromium webkit
npm run test:e2e
npm run test:beta
npm run verify:restart
```

Run these commands sequentially. Browser suites build production first and use temporary databases on ports 3100 (desktop) and 3443 (phone). Restart checks use port 3101. They do not reset personal data or need an AI key. Node may print an experimental SQLite warning.

Verified from a clean repository export on October 9, 2026: **39 core tests, 10 desktop browser tests, and 12 phone browser checks** passed, along with lint, typecheck, formatting, build, and restart verification. The [installation guide](IPHONE_BETA.md) records testing details and the WebKit test-runner workaround. Native Files sharing and keyboard behavior can be checked using its physical-device checklist.

## Code and product guide

The app uses Next.js, TypeScript, React, and SQLite. The phone reuses the same reading screens and domain logic with on-device storage and a cached application shell.

| Area                                       | Location                             |
| ------------------------------------------ | ------------------------------------ |
| Session rules, ranking, Enough, and recall | [src/domain/](src/domain/)           |
| Phone storage and offline actions          | [src/client/](src/client/)           |
| Reading screens                            | [src/components/](src/components/)   |
| Mac database, AI, and source extraction    | [src/server/](src/server/)           |
| Attributed seed ideas                      | [src/data/seed.ts](src/data/seed.ts) |
| Automated checks                           | [tests/](tests/)                     |

Ranking is explicit and testable: 30% interest, 25% novelty, 15% depth, 15% source quality, 10% connection, and 5% diversity. Each idea exposes its recommendation breakdown. Source quality is a conservative estimate, not a truth rating. Time sessions select at most 15 ideas; focused collections may have fewer eligible ideas.

For the full product requirements, see [PERSONAL_DISCOVERY_APP_SPEC.md](PERSONAL_DISCOVERY_APP_SPEC.md). Architecture choices are in [DECISIONS.md](DECISIONS.md), and remaining work is in [TODO.md](TODO.md).
