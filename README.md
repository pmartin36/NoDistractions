# No Distractions

A Chrome extension that lets you restrict distracting sites (YouTube, Reddit, etc.) to specific hours of the day. Visit one outside its allowed window and you're sent to a full-screen blackout page — the only way through is typing an exact commitment phrase.

## Features

- **Per-site schedules** — pick a domain and drag a dual-handle slider to set its allowed hours (e.g. 9:00 AM – 11:00 PM). Outside that window, the site is blocked.
- **Blackout page** — blocked navigations redirect to a full-tab screen requiring you to type *"I am using this site for self improvement, not wasting time"* exactly (case-sensitive) before continuing.
- **30-minute grace unlock** — typing the phrase correctly unlocks the site for 30 minutes, then it re-locks automatically, even on tabs that are already open.
- **Tamper-locked editing** — while a site is currently in its blocked window, you can't loosen or delete its schedule from the options page. You can always add new sites.
- **Domain + subdomain matching** — adding `youtube.com` also covers `www.youtube.com`, `m.youtube.com`, etc.
- **Synced settings** — your site list syncs across desktop Chrome installs (Windows/macOS/Linux/ChromeOS) signed into the same Google account via `chrome.storage.sync`. This does **not** include Chrome on Android or iOS, which don't run extensions.

## Installing (unpacked, until published to the Web Store)

1. Clone this repo.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the repo folder.
5. Click the extension icon → **Manage sites** to add your first site.

After pulling new changes, click the reload icon (⟳) on the extension's card in `chrome://extensions`. Already-open options/blocked tabs need a manual page refresh to pick up changes; the popup reloads fresh every time you open it.

## How it works

- `background.js` — a Manifest V3 service worker. It watches navigations (`chrome.webNavigation`) and re-checks all open tabs once a minute (`chrome.alarms`) against each site's schedule, redirecting blocked tabs to the blackout page.
- `lib/rules.js` — shared logic for domain matching, schedule/time-window math, and storage access, used by the background worker, options page, and blocked page.
- `blocked/` — the blackout page shown for out-of-window navigations. Verifies the typed phrase via a message to the background worker and, on success, grants a 30-minute unlock before returning you to the original page.
- `options/` — full-page site manager: add/remove sites, toggle them on/off, and drag each site's allowed-hours slider. Rows lock while their site is currently blocked.
- `popup/` — small popup showing the current tab's status (allowed/blocked, time remaining) and a shortcut to the options page.

## Permissions

- `storage` — save your site list (`chrome.storage.sync`) and temporary unlock state (`chrome.storage.local`).
- `alarms` — periodic re-check of open tabs so a schedule boundary takes effect immediately, not just on next navigation.
- `tabs`, `webNavigation`, and broad host permissions (`http://*/*`, `https://*/*`) — needed to detect and redirect navigations to whatever domains you add, since sites aren't known ahead of time.

Nothing is sent off your machine — all state stays in Chrome's local/sync storage.
