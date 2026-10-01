import {
  getSites,
  getUnlocks,
  findRuleForHostname,
  isBlockedNow,
  checkPhrase,
  unlockDomain,
} from "./lib/rules.js";

const RECHECK_ALARM = "recheck";

function blockedUrlFor(domain, originalUrl) {
  const params = new URLSearchParams({
    site: domain,
    return: originalUrl || `https://${domain}`,
  });
  return chrome.runtime.getURL(`blocked/blocked.html?${params.toString()}`);
}

function isOwnBlockedPage(url) {
  return url.startsWith(chrome.runtime.getURL("blocked/"));
}

function hostnameOf(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.hostname;
  } catch {
    return null;
  }
}

async function maybeRedirectTab(tabId, url) {
  if (!url || isOwnBlockedPage(url)) return;
  const hostname = hostnameOf(url);
  if (!hostname) return;

  const [sites, unlocks] = await Promise.all([getSites(), getUnlocks()]);
  const rule = findRuleForHostname(hostname, sites);
  if (!rule) return;

  if (isBlockedNow(rule, unlocks)) {
    chrome.tabs.update(tabId, { url: blockedUrlFor(rule.domain, url) });
  }
}

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  maybeRedirectTab(details.tabId, details.url);
});

// Blocking is conservative: only ever redirect the tab the user is actually
// looking at. Background tabs are left alone until they're focused or navigated.
async function checkActiveTab(windowId) {
  const query = { active: true };
  if (windowId === undefined) {
    query.lastFocusedWindow = true;
  } else {
    query.windowId = windowId;
  }
  const [tab] = await chrome.tabs.query(query);
  if (tab && tab.id !== undefined) {
    maybeRedirectTab(tab.id, tab.url);
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || tab.id === undefined) return;
    maybeRedirectTab(tab.id, tab.url);
  });
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  checkActiveTab(windowId);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RECHECK_ALARM) {
    checkActiveTab();
  }
});

function ensureAlarm() {
  chrome.alarms.get(RECHECK_ALARM, (existing) => {
    if (!existing) {
      chrome.alarms.create(RECHECK_ALARM, { periodInMinutes: 1 });
    }
  });
}

chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);
ensureAlarm();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "attempt") {
    (async () => {
      const ok = checkPhrase(message.phrase || "");
      if (ok) {
        await unlockDomain(message.domain);
      }
      sendResponse({ ok });
    })();
    return true;
  }

  if (message?.type === "isEditLocked") {
    (async () => {
      const [sites, unlocks] = await Promise.all([getSites(), getUnlocks()]);
      const rule = sites.find((site) => site.domain === message.domain);
      const locked = rule ? isBlockedNow(rule, unlocks) : false;
      sendResponse({ locked });
    })();
    return true;
  }

  return false;
});
