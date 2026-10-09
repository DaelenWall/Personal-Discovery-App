# Private iPhone beta

This beta installs as a Safari Home Screen app for your devices. No public site, App Store submission, or TestFlight distribution is involved.

**Status:** the owner confirmed that the beta is functional on October 9, 2026. The steps below remain the setup and troubleshooting guide; use the device checklist for any behavior not yet checked individually.

Reading data lives on the iPhone in IndexedDB. The first connected opening copies the current Mac collection once. Afterwards, the phone and desktop collections are independent. Export/restore transfers data explicitly; there is no background merge.

## Start the private Mac service

Keep your Mac and iPhone on the same private Wi-Fi network:

```sh
npm run build
npm run beta:prepare
npm run beta:start
```

Preparation chooses the Mac's `.local` name and private IPv4 interface. The service uses HTTPS on port 4433 and rejects unpaired data requests. The terminal prints the exact phone URL and a pairing code valid for 30 minutes. Restart `beta:start` for another code. Paired cookies survive a service restart.

Certificates, private keys, configuration, and pairing information live in ignored `data/beta/`. Preparation does not change system trust. The root is valid for one year and server certificates for 90 days. Re-run preparation after a Wi-Fi address change or before server-certificate expiry. The existing root is preserved.

If automatic selection is wrong, set `DISCOVERY_BETA_BIND` to your Mac's private IPv4 address and `DISCOVERY_BETA_HOST` to its `.local` hostname before preparation. Keep using the same hostname; phone storage belongs to that exact origin.

## Install on your iPhone

1. Transfer `data/beta/Commonplace-Beta.mobileconfig` from your own Mac to your iPhone, for example with AirDrop. Preparation generates this file locally; it is excluded from GitHub. This profile contains only this beta's local root certificate. Its name is **Commonplace Private Beta**.
2. Install the downloaded profile in **Settings → General → VPN & Device Management**. Enable **Commonplace Private Beta Root** in **Settings → General → About → Certificate Trust Settings**. Apple documents the [manual trust step](https://support.apple.com/en-us/102390). Preparation prints the root's SHA-256 fingerprint for comparison.
3. In Safari, open the exact HTTPS `/phone` URL printed by `beta:start` and enter the pairing code. If macOS requests local-network/firewall access for Node, allow it for this private beta.
4. Use **Share → Add to Home Screen → Open as Web App → Add**, following [Apple's installation guide](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).
5. Open the installed **Commonplace** icon while connected. If asked, pair the installed app using the same code. Wait for **Ready for offline reading**. Install before real reading: Safari and the installed app may have separate device storage.

Certificate trust and Home Screen installation must be completed on your iPhone. Mac browser tests cannot perform them. The beta does not request notifications.

## Offline behavior

Sessions, finite feeds, saves, known/dismiss feedback, Enough, recall, summaries, deep dives, notes, preferences, pasted-text review, and device JSON backups work offline. Reopening resumes saved device data. Time expiry preserves the current topic and ends upon Next.

New AI answers, provider setup, source URLs, and URL extraction need the running Mac service and a connection. Offline Ask clearly returns stored explanations. Live AI needs an OpenAI key and model configured in Settings. Keys stay on the Mac and are excluded from device storage and offline caches.

## Check before using real notes

On the installed app, verify one 5-idea session, a timed reminder, a saved note, force-close/reopen, and an offline reload with Wi-Fi disabled. Export a backup to Files and confirm restoration. Clearing Safari data or removing the app can remove browser storage, so keep a backup. Persistent storage is requested; the browser decides whether to grant it.

Automated beta checks use WebKit with an iPhone viewport and Chromium, a local HTTPS service, and isolated storage. Actual installation and physical-device validation remain a user-performed step.

## Verified beta milestone · October 6, 2026

- Lint, typecheck, formatting, and production build pass.
- 39 core tests and 10 desktop browser regression tests pass.
- 12 phone browser checks pass across WebKit and Chromium: private access, layout, offline sessions/reload, notes, source ingestion, JSON restore, timed reminders, and Enough.
- A full production restart preserves reading data and a dismissed deadline reminder.
- The prepared profile passes plist validation; the server certificate verifies against its root. The running Wi-Fi service was checked for trusted TLS, unpaired-read rejection, secure pairing, and the phone shell.

WebKit reload/restore checks stop the actual isolated service because [Playwright 1.63's offline emulation has a service-worker navigation bug](https://github.com/microsoft/playwright/issues/42775). Chromium uses offline emulation throughout. The owner subsequently confirmed that the beta works; native Files sharing and software-keyboard checks remain useful device-specific regression checks.

## Stop or remove

Control-C stops the Mac service. Prepared reading remains available offline. Export device data before removing the Home Screen app or the **Commonplace Private Beta** certificate profile from iPhone Settings.
