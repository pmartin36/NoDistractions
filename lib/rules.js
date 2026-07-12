// Shared logic used by background.js, options/options.js, and blocked/blocked.js.

export const REQUIRED_PHRASE =
  "I am using this site for self improvement, not wasting time";

export const GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes

export function genId() {
  return crypto.randomUUID();
}

// Strip protocol, "www.", path/query/hash, and lowercase. Accepts either a
// bare domain ("youtube.com") or a full URL/hostname the user pastes in.
export function normalizeDomain(input) {
  let value = input.trim().toLowerCase();
  value = value.replace(/^[a-z]+:\/\//, "");
  value = value.split("/")[0];
  value = value.split("?")[0];
  value = value.split("#")[0];
  value = value.replace(/^www\./, "");
  return value;
}

// True if hostname is the domain itself or any subdomain of it.
export function hostnameMatchesDomain(hostname, domain) {
  const host = hostname.toLowerCase();
  return host === domain || host.endsWith("." + domain);
}

// Find the first enabled rule whose domain matches this hostname.
export function findRuleForHostname(hostname, sites) {
  return (
    sites.find(
      (site) => site.enabled && hostnameMatchesDomain(hostname, site.domain)
    ) || null
  );
}

export function minutesNowLocal(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

// Handles windows that wrap past midnight (e.g. start=1320 end=120).
export function isWithinWindow(minute, startMinute, endMinute) {
  if (startMinute === endMinute) return true; // full 24h window
  if (startMinute < endMinute) {
    return minute >= startMinute && minute < endMinute;
  }
  return minute >= startMinute || minute < endMinute;
}

export function isAllowedByScheduleNow(rule, now = new Date()) {
  if (!rule.enabled) return true;
  return isWithinWindow(minutesNowLocal(now), rule.startMinute, rule.endMinute);
}

export function isUnlocked(domain, unlocks, now = Date.now()) {
  const expiry = unlocks[domain];
  return typeof expiry === "number" && expiry > now;
}

// True if this rule should currently show the blackout screen.
export function isBlockedNow(rule, unlocks, now = new Date()) {
  if (!rule.enabled) return false;
  if (isAllowedByScheduleNow(rule, now)) return false;
  if (isUnlocked(rule.domain, unlocks, now.getTime())) return false;
  return true;
}

export function checkPhrase(input) {
  return input.trim() === REQUIRED_PHRASE;
}

export function formatMinutes(totalMinutes) {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(m / 60);
  const minutes = m % 60;
  const period = hours24 < 12 ? "AM" : "PM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

const SITES_KEY = "sites";
const UNLOCKS_KEY = "unlocks";

export async function getSites() {
  const result = await chrome.storage.sync.get(SITES_KEY);
  return result[SITES_KEY] || [];
}

export async function setSites(sites) {
  await chrome.storage.sync.set({ [SITES_KEY]: sites });
}

export async function getUnlocks() {
  const result = await chrome.storage.local.get(UNLOCKS_KEY);
  return result[UNLOCKS_KEY] || {};
}

export async function setUnlocks(unlocks) {
  await chrome.storage.local.set({ [UNLOCKS_KEY]: unlocks });
}

export async function unlockDomain(domain, now = Date.now()) {
  const unlocks = await getUnlocks();
  unlocks[domain] = now + GRACE_PERIOD_MS;
  await setUnlocks(unlocks);
  return unlocks[domain];
}
