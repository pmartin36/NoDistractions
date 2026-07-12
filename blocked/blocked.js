const params = new URLSearchParams(location.search);
const domain = params.get("site") || "";
const returnUrl = params.get("return") || (domain ? `https://${domain}` : "");

const domainEl = document.getElementById("site-domain");
const form = document.getElementById("unlock-form");
const input = document.getElementById("phrase-input");
const button = document.getElementById("go-button");
const errorEl = document.getElementById("error-message");

if (domain) {
  domainEl.textContent = domain;
}

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
