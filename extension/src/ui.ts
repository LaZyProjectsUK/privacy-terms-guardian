import { AlternativesResult, AnalysisResult, RiskLevel } from "./types";

const BADGE: Record<RiskLevel, string> = {
  concerning: "🟠",
  high_concern: "🔴",
};

export function renderAnalysis(result: AnalysisResult): string {
  if (result.findings.length === 0) {
    return "<p>🟢 Nothing that should worry you.</p>";
  }
  const items = result.findings
    .map((f) => `<li>${BADGE[f.level]} ${escapeHtml(f.summary)}</li>`)
    .join("");
  return `<ul style="padding-left:18px; margin:0;">${items}</ul>`;
}

const VERDICT_BADGE: Record<AlternativesResult["verdict"], string> = {
  good_fit: "🟢",
  consider_alternatives: "🟠",
};

export function renderAlternatives(result: AlternativesResult): string {
  const header = `
    <p>
      ${VERDICT_BADGE[result.verdict]} <strong>${escapeHtml(result.detectedService)}</strong>
      — ${result.currentSiteScore}/100<br/>
      ${escapeHtml(result.summary)}
    </p>`;

  if (result.alternatives.length === 0) {
    return header;
  }

  const rows = result.alternatives
    .map(
      (a) => `
      <tr>
        <td><a href="${escapeAttr(a.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.name)}</a></td>
        <td>${escapeHtml(a.function)}</td>
        <td>${a.privacyScore}/100</td>
      </tr>`
    )
    .join("");
  return `
    ${header}
    <table style="width:100%; border-collapse:collapse;">
      <thead><tr><th>Alternative</th><th>Function</th><th>Score</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function escapeHtml(input: string): string {
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
}

/** For use inside an HTML attribute (e.g. href="...") — escapeHtml alone doesn't escape quotes, and this also refuses non-http(s) schemes from a model-generated URL. */
function escapeAttr(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "#";
  } catch {
    return "#";
  }
  return escapeHtml(url).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
