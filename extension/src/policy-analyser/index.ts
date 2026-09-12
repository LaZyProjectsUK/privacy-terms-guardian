import { BACKEND_URL } from "../config";
import { AnalysisResult } from "../types";

/**
 * Grabs the main readable text of the current page. Good enough for policy
 * pages, which are almost always a single long article of text.
 */
export function extractPageText(): string {
  const main = document.querySelector<HTMLElement>("main, article") ?? document.body;
  // innerText (not textContent) so we get rendered, visible text only —
  // textContent also pulls in raw JSON/script content from <script> tags,
  // which pollutes policy analysis with garbage.
  return (main.innerText ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Extracts text from HTML fetched via fetch() rather than the live DOM.
 * DOMParser documents are never rendered, so innerText (layout-dependent)
 * returns nothing useful here — strip non-content tags and fall back to
 * textContent instead.
 */
export function extractTextFromHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript, template, svg").forEach((el) => el.remove());
  const main = doc.querySelector("main, article") ?? doc.body;
  return (main?.textContent ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function looksLikePolicyPage(): boolean {
  const title = document.title.toLowerCase();
  const url = location.href.toLowerCase();
  const markers = ["privacy", "terms", "cookie", "policy", "legal"];
  return markers.some((m) => title.includes(m) || url.includes(m));
}

export async function analysePolicyText(policyText: string): Promise<AnalysisResult> {
  const res = await fetch(`${BACKEND_URL}/analyse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ policyText }),
  });

  if (!res.ok) {
    throw new Error(`Analysis request failed: ${res.status}`);
  }

  return res.json();
}
