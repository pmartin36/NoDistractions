import {
  getSites,
  getUnlocks,
  findRuleForHostname,
  isAllowedByScheduleNow,
  isUnlocked,
  minutesNowLocal,
  formatMinutes,
} from "../lib/rules.js";

const domainText = document.getElementById("domain-text");
const statusText = document.getElementById("status-text");
const manageBtn = document.getElementById("manage-btn");

manageBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

function minutesUntil(targetMinute, nowMinute) {
  return ((targetMinute - nowMinute + 1440) % 1440) || 1440;
}

function setStatus(message, kind) {
  statusText.textContent = message;
  statusText.className = `status-line ${kind || ""}`.trim();
}

async function render() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";

  let hostname = null;
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = null;
  }

  if (!hostname) {
    domainText.textContent = "No active tab";
    setStatus("Not a trackable page.");
    return;
  }

  domainText.textContent = hostname;

  const [sites, unlocks] = await Promise.all([getSites(), getUnlocks()]);
  const rule = findRuleForHostname(hostname, sites);

  if (!rule) {
    setStatus("Not on your tracked list.");
    return;
  }

  if (!rule.enabled) {
    setStatus("Tracking disabled for this site.");
    return;
  }

  const now = minutesNowLocal();

  if (isAllowedByScheduleNow(rule)) {
    const remaining = minutesUntil(rule.endMinute, now);
    setStatus(
      `Allowed until ${formatMinutes(rule.endMinute)} (${remaining} min left).`,
      "allowed"
    );
    return;
  }

  if (isUnlocked(rule.domain, unlocks)) {
    const remainingMs = unlocks[rule.domain] - Date.now();
    const remainingMin = Math.max(1, Math.round(remainingMs / 60000));
    setStatus(`Unlocked for ${remainingMin} more min (grace period).`, "allowed");
    return;
  }

  const remaining = minutesUntil(rule.startMinute, now);
  setStatus(
    `Blocked — opens at ${formatMinutes(rule.startMinute)} (${remaining} min).`,
    "blocked"
  );
}

render();
