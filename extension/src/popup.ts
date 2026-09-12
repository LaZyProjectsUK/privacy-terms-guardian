import { RuntimeMessage } from "./types";
import { renderAlternatives, renderAnalysis } from "./ui";

const root = document.getElementById("root")!;

function setContent(html: string) {
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

  document.getElementById("analyse")!.addEventListener("click", () => run("ANALYSE_PAGE"));
  document.getElementById("protect")!.addEventListener("click", () => run("PROTECT_COOKIES"));
  document.getElementById("find-better")!.addEventListener("click", () => run("FIND_BETTER"));
  document.getElementById("reset-reviewed")!.addEventListener("click", resetReviewedSites);
}

async function resetReviewedSites() {
  const resultEl = document.getElementById("result")!;
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((k) => k.startsWith("guardian:reviewed:"));
  if (keys.length > 0) await chrome.storage.local.remove(keys);
  resultEl.textContent = `Cleared ${keys.length} remembered site${keys.length === 1 ? "" : "s"} — they'll be reviewed again.`;
}

function run(kind: "ANALYSE_PAGE" | "PROTECT_COOKIES" | "FIND_BETTER") {
  const resultEl = document.getElementById("result")!;
  resultEl.textContent = "Working…";

  chrome.runtime.sendMessage({ kind }, (response: RuntimeMessage) => {
    if (!response || response.kind === "ERROR") {
      resultEl.textContent = `Error: ${response?.message ?? "no response"}`;
      return;
    }
    switch (response.kind) {
      case "ANALYSE_RESULT":
        resultEl.innerHTML = renderAnalysis(response.result);
        break;
      case "PROTECT_RESULT":
        resultEl.textContent = `${response.verified ? "✅" : "⚠️"} ${response.detail}`;
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
