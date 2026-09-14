// src/ui.ts
var BADGE = {
  concerning: "\u{1F7E0}",
  high_concern: "\u{1F534}"
};
function renderAnalysis(result) {
  if (result.findings.length === 0) {
    return "<p>\u{1F7E2} Nothing that should worry you.</p>";
  }
  const items = result.findings.map((f) => `<li>${BADGE[f.level]} ${escapeHtml(f.summary)}</li>`).join("");
  return `<ul style="padding-left:18px; margin:0;">${items}</ul>`;
}
var VERDICT_BADGE = {
  good_fit: "\u{1F7E2}",
  consider_alternatives: "\u{1F7E0}"
};
function renderAlternatives(result) {
  const header = `
    <p>
      ${VERDICT_BADGE[result.verdict]} <strong>${escapeHtml(result.detectedService)}</strong>
      \u2014 ${result.currentSiteScore}/100<br/>
      ${escapeHtml(result.summary)}
    </p>`;
  if (result.alternatives.length === 0) {
    return header;
  }
  const rows = result.alternatives.map(
    (a) => `
      <tr>
        <td><a href="${escapeAttr(a.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.name)}</a></td>
        <td>${escapeHtml(a.function)}</td>
        <td>${a.privacyScore}/100</td>
      </tr>`
  ).join("");
  return `
    ${header}
    <table style="width:100%; border-collapse:collapse;">
      <thead><tr><th>Alternative</th><th>Function</th><th>Score</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}
function escapeHtml(input) {
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
}
function escapeAttr(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "#";
  } catch {
    return "#";
  }
  return escapeHtml(url).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// src/popup.ts
var root = document.getElementById("root");
function setContent(html) {
  root.innerHTML = html;
}
function renderButtons() {
  setContent(`
    <button id="analyse">Analyse</button>
    <button id="protect">Protect</button>
    <button id="find-better">Find Better</button>
    <button id="reset-reviewed" style="margin-top:6px;">Reset "don't ask again" sites</button>
    <div id="result" style="margin-top:10px;"></div>
  `);
  document.getElementById("analyse").addEventListener("click", () => run("ANALYSE_PAGE"));
  document.getElementById("protect").addEventListener("click", () => run("PROTECT_COOKIES"));
  document.getElementById("find-better").addEventListener("click", () => run("FIND_BETTER"));
  document.getElementById("reset-reviewed").addEventListener("click", resetReviewedSites);
}
async function resetReviewedSites() {
  const resultEl = document.getElementById("result");
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((k) => k.startsWith("guardian:reviewed:"));
  if (keys.length > 0) await chrome.storage.local.remove(keys);
  resultEl.textContent = `Cleared ${keys.length} remembered site${keys.length === 1 ? "" : "s"} \u2014 they'll be reviewed again.`;
}
function run(kind) {
  const resultEl = document.getElementById("result");
  resultEl.textContent = "Working\u2026";
  chrome.runtime.sendMessage({ kind }, (response) => {
    if (!response || response.kind === "ERROR") {
      resultEl.textContent = `Error: ${response?.message ?? "no response"}`;
      return;
    }
    switch (response.kind) {
      case "ANALYSE_RESULT":
        resultEl.innerHTML = renderAnalysis(response.result);
        break;
      case "PROTECT_RESULT":
        resultEl.textContent = `${response.verified ? "\u2705" : "\u26A0\uFE0F"} ${response.detail}`;
        break;
      case "FIND_BETTER_RESULT":
        resultEl.innerHTML = renderAlternatives(response.result);
        break;
      default:
        resultEl.textContent = "Unexpected response";
    }
  });
}
renderButtons();
//# sourceMappingURL=popup.js.map
