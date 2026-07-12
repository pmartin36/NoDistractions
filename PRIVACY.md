# Privacy Policy — No Distractions

**Last updated:** 2026-07-12

No Distractions does not collect, transmit, sell, or share any user data.

## What the extension stores

- **Your site list** (domain names and allowed-hours schedules you add) — stored with `chrome.storage.sync`.
- **Temporary unlock state** (how long a site stays unlocked after you type the commitment phrase) — stored with `chrome.storage.local`.

Both are Chrome's own built-in storage APIs. `chrome.storage.sync` data syncs across your own signed-in Chrome installs via your Google account — this is Google's infrastructure, not a server operated by this extension's developer. No other party has access to it.

## What the extension does with your browsing

The background script reads the URL of the active/open tabs, on-device, solely to compare the hostname against the list of sites you added. This check happens locally and its result (allowed or blocked) is never logged, stored beyond the current check, or transmitted anywhere.

## What the extension does not do

- No servers. The extension makes no network requests of any kind.
- No analytics, telemetry, or crash reporting.
- No collection of personally identifiable information — no name, email, account details, or location.
- No selling or sharing of data with third parties, because none is collected in the first place.

## Contact

Questions about this policy can be raised via [GitHub Issues](https://github.com/pmartin36/NoDistractions/issues) on this repository.
