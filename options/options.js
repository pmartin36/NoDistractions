import { getSites, setSites, genId, normalizeDomain, formatMinutes } from "../lib/rules.js";

const DEFAULT_START = 9 * 60; // 9:00 AM
const DEFAULT_END = 23 * 60; // 11:00 PM
const MIN_GAP = 15;
const LOCK_REFRESH_MS = 30000;

const listEl = document.getElementById("site-list");
const emptyNote = document.getElementById("empty-note");
const addForm = document.getElementById("add-site-form");
const addInput = document.getElementById("add-domain-input");
const addError = document.getElementById("add-error");
const rowTemplate = document.getElementById("site-row-template");

async function isEditLocked(domain) {
  const response = await chrome.runtime.sendMessage({
    type: "isEditLocked",
    domain,
  });
  return Boolean(response?.locked);
}

function buildRow(site, sites, locked) {
  const node = rowTemplate.content.firstElementChild.cloneNode(true);

  const domainEl = node.querySelector(".site-domain");
  const toggle = node.querySelector(".enabled-toggle");
  const deleteBtn = node.querySelector(".delete-btn");
  const rangeStart = node.querySelector(".range-start");
  const rangeEnd = node.querySelector(".range-end");
  const highlight = node.querySelector(".track-highlight");
  const startLabel = node.querySelector(".start-label");
  const endLabel = node.querySelector(".end-label");
  const lockNote = node.querySelector(".lock-note");

  domainEl.textContent = site.domain;
  toggle.checked = site.enabled;
  rangeStart.value = site.startMinute;
  rangeEnd.value = site.endMinute;

  function refreshLabelsAndTrack() {
    const start = Number(rangeStart.value);
    const end = Number(rangeEnd.value);
    startLabel.textContent = formatMinutes(start);
    endLabel.textContent = formatMinutes(end);
    const startPct = (start / 1440) * 100;
    const endPct = (end / 1440) * 100;
    highlight.style.left = `${startPct}%`;
    highlight.style.width = `${Math.max(0, endPct - startPct)}%`;
  }
  refreshLabelsAndTrack();

  async function persist() {
    const updated = sites.map((s) =>
      s.id === site.id
        ? {
            ...s,
            enabled: toggle.checked,
            startMinute: Number(rangeStart.value),
            endMinute: Number(rangeEnd.value),
          }
        : s
    );
    await setSites(updated);
  }

  if (locked) {
    node.classList.add("locked");
    toggle.disabled = true;
    rangeStart.disabled = true;
    rangeEnd.disabled = true;
    deleteBtn.disabled = true;
    lockNote.textContent = `Currently blocked — schedule locked until it reopens at ${formatMinutes(
      site.startMinute
    )}.`;
  } else {
    toggle.addEventListener("change", async () => {
      await persist();
      render();
    });

    deleteBtn.addEventListener("click", async () => {
      const updated = sites.filter((s) => s.id !== site.id);
      await setSites(updated);
      render();
    });

    rangeStart.addEventListener("input", () => {
      if (Number(rangeStart.value) > Number(rangeEnd.value) - MIN_GAP) {
        rangeStart.value = Number(rangeEnd.value) - MIN_GAP;
      }
      refreshLabelsAndTrack();
    });
    rangeEnd.addEventListener("input", () => {
      if (Number(rangeEnd.value) < Number(rangeStart.value) + MIN_GAP) {
        rangeEnd.value = Number(rangeStart.value) + MIN_GAP;
      }
      refreshLabelsAndTrack();
    });

    rangeStart.addEventListener("change", persist);
    rangeEnd.addEventListener("change", persist);
  }

  return node;
}

async function render() {
  const sites = await getSites();
  emptyNote.style.display = sites.length ? "none" : "block";
  listEl.innerHTML = "";

  const lockStates = await Promise.all(
    sites.map((site) => isEditLocked(site.domain))
  );

  sites.forEach((site, index) => {
    listEl.appendChild(buildRow(site, sites, lockStates[index]));
  });
}

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  addError.textContent = "";
  const domain = normalizeDomain(addInput.value);

  if (!domain || !domain.includes(".")) {
    addError.textContent = "Enter a valid domain, e.g. youtube.com";
    return;
  }

  const sites = await getSites();
  if (sites.some((s) => s.domain === domain)) {
    addError.textContent = `${domain} is already in your list.`;
    return;
  }

  sites.push({
    id: genId(),
    domain,
    startMinute: DEFAULT_START,
    endMinute: DEFAULT_END,
    enabled: true,
  });
  await setSites(sites);
  addInput.value = "";
  render();
});

render();
setInterval(render, LOCK_REFRESH_MS);
