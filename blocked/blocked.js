import {
  getSites,
  getUnlocks,
  findRuleForHostname,
  isBlockedNow,
} from "../lib/rules.js";

const params = new URLSearchParams(location.search);
const domain = params.get("site") || "";
const returnUrl = params.get("return") || (domain ? `https://${domain}` : "");

const domainEl = document.getElementById("site-domain");
const form = document.getElementById("unlock-form");
const input = document.getElementById("phrase-input");
const button = document.getElementById("go-button");
const errorEl = document.getElementById("error-message");
const phraseEl = document.getElementById("phrase-to-copy");

if (domain) {
  domainEl.textContent = domain;
}

// The user has to type the phrase themselves, not copy/paste it.
for (const eventName of ["copy", "cut", "contextmenu", "dragstart"]) {
  phraseEl.addEventListener(eventName, (event) => event.preventDefault());
}
input.addEventListener("paste", (event) => event.preventDefault());

function safeReturnUrl() {
  try {
    const parsed = new URL(returnUrl);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    // fall through
  }
  return domain ? `https://${domain}` : "about:blank";
}

function rejectAttempt(message) {
  errorEl.textContent = message;
  input.value = "";
  input.classList.remove("shake");
  // Force reflow so the animation can restart on repeated wrong attempts.
  void input.offsetWidth;
  input.classList.add("shake");
  input.focus();
}

// Freeing is aggressive: every blackout tab watches live state and sends
// itself back to the site the moment it's allowed again, with no focus or
// navigation needed. Covers the schedule window reopening, a grace unlock in
// another tab, and the site being removed or disabled in options.
async function returnIfFreed() {
  if (!domain) return;
  const [sites, unlocks] = await Promise.all([getSites(), getUnlocks()]);
  const rule = findRuleForHostname(domain, sites);
  if (!rule || !isBlockedNow(rule, unlocks)) {
    location.href = safeReturnUrl();
  }
}

chrome.storage.onChanged.addListener(() => {
  returnIfFreed();
});

// Storage changes cover unlocks and schedule edits instantly; the interval
// catches the schedule window simply reaching its reopen time.
setInterval(returnIfFreed, 5000);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!domain) return;

  button.disabled = true;
  errorEl.textContent = "";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "attempt",
      domain,
      phrase: input.value,
    });

    if (response?.ok) {
      location.href = safeReturnUrl();
      return;
    }

    rejectAttempt("Not quite — type it exactly as shown above.");
  } catch {
    rejectAttempt("Something went wrong. Try again.");
  } finally {
    button.disabled = false;
  }
});
