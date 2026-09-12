import { executeAction } from "./browser-tools";
import { extractTextFromHtml } from "./policy-analyser";
import { hideOverlay, onAction, renderStage, showOverlay } from "./overlay";
import { detectSignupContext, parsePolicyLinksFromHtml, PolicyLink } from "./signup-detector";
import { AlternativesResult, AnalysisResult, BrowserAction, FetchedPage, RuntimeMessage } from "./types";
import { renderAlternatives, renderAnalysis } from "./ui";

/**
 * Keyed by the actual set of policy documents found, not just the origin —
 * a shared identity provider (e.g. accounts.autodesk.com) hosts unrelated
 * flows (sign-in with no Terms at all, a Teacher Agreement, a personal
 * sign-up) that each surface different documents. Dismissing one must not
 * silence a genuinely different one on the same domain.
 */
function reviewedKey(links: PolicyLink[]): string {
  const docs = links
    .map((l) => l.url)
    .sort()
    .join("|");
  return `guardian:reviewed:${docs}`;
}

async function hasBeenReviewed(links: PolicyLink[]): Promise<boolean> {
  const key = reviewedKey(links);
  const stored = await chrome.storage.local.get(key);
  return !!stored[key];
}

function markReviewed(links: PolicyLink[]): void {
  chrome.storage.local.set({ [reviewedKey(links)]: { at: Date.now() } });
}

interface ExecuteActionMessage {
  kind: "EXECUTE_ACTION";
  action: BrowserAction;
}

chrome.runtime.onMessage.addListener((message: ExecuteActionMessage | RuntimeMessage, _sender, sendResponse) => {
  if ((message as ExecuteActionMessage).kind !== "EXECUTE_ACTION") return false;
  sendResponse(executeAction((message as ExecuteActionMessage).action));
  return false; // executeAction is synchronous
});

function sendToBackground(message: RuntimeMessage): Promise<RuntimeMessage> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: RuntimeMessage) => {
      if (chrome.runtime.lastError) {
        resolve({ kind: "ERROR", message: chrome.runtime.lastError.message ?? "unknown error" });
        return;
      }
      resolve(response ?? { kind: "ERROR", message: "no response from background" });
    });
  });
}

function escapeHtml(input: string): string {
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
}

function renderLinksFoundStage(links: PolicyLink[]): string {
  const items = links.map((l) => `<div class="links">📄 ${escapeHtml(l.label)}</div>`).join("");
  return `
    <div class="stage-label"><span class="spinner"></span>Found ${links.length} policy link(s) on this page. Reading them before you sign up…</div>
    ${items}`;
}

function renderReadingStage(pages: FetchedPage[]): string {
  const items = pages
    .map((p) =>
      p.error
        ? `<div class="links">⚠️ ${escapeHtml(p.label)} — couldn't read it</div>`
        : `<div class="links">✅ ${escapeHtml(p.label)} read</div>`
    )
    .join("");
  return `
    ${items}
    <div class="stage-label"><span class="spinner"></span>Checking for anything that could hurt you…</div>`;
}

function renderErrorStage(message: string): string {
  return `
    <div class="stage-label">Something went wrong: ${escapeHtml(message)}</div>
    <div class="footer"><button class="primary" id="close-error">Close</button></div>`;
}

/** One-line note per broken link, e.g. "🔴 Terms of Service link is broken (404 Not Found)". */
function renderBrokenLinksNote(brokenPages: FetchedPage[]): string {
  const items = brokenPages
    .map((p) => `<li>🔴 ${escapeHtml(p.label)} link is broken (${escapeHtml(p.error ?? "failed to load")})</li>`)
    .join("");
  return `<ul style="padding-left:18px; margin:0 0 10px;">${items}</ul>`;
}

/**
 * A site linking to its own Terms/Privacy and having that link 404 is
 * itself worth surfacing — not just a dead-end error to dismiss. This is
 * genuinely useful signal (the site's own consent flow is broken), so it
 * gets a stage of its own rather than folding into renderErrorStage.
 */
function renderAllLinksBrokenStage(brokenPages: FetchedPage[]): string {
  return `
    <div class="stage-label">🔴 This site links to its own Terms/Privacy Policy, but the link${brokenPages.length > 1 ? "s don't" : " doesn't"} work:</div>
    ${renderBrokenLinksNote(brokenPages)}
    <div class="footer"><button class="primary" id="close-error">Close</button></div>`;
}

function renderResultStage(result: AnalysisResult, links: PolicyLink[], brokenPages: FetchedPage[] = []) {
  renderStage(`
    ${brokenPages.length > 0 ? renderBrokenLinksNote(brokenPages) : ""}
    ${renderAnalysis(result)}
    <div class="footer">
      <button id="find-better">Not happy — Find Better</button>
      <button class="primary" id="continue">Continue anyway</button>
    </div>`);

  onAction("#continue", () => {
    markReviewed(links);
    hideOverlay();
  });
  onAction("#find-better", () => runFindBetter(links));
}

function renderAlternativesStage(result: AlternativesResult, links: PolicyLink[]) {
  renderStage(`
    ${renderAlternatives(result)}
    <div class="footer"><button class="primary" id="close">Close</button></div>`);
  onAction("#close", () => {
    markReviewed(links);
    hideOverlay();
  });
}

async function runFindBetter(links: PolicyLink[]) {
  renderStage(`<div class="stage-label"><span class="spinner"></span>Looking for better alternatives…</div>`);
  const resp = await sendToBackground({ kind: "FIND_BETTER" });
  if (resp.kind === "ERROR") {
    renderStage(renderErrorStage(resp.message));
    onAction("#close-error", () => hideOverlay());
    return;
  }
  if (resp.kind === "FIND_BETTER_RESULT") renderAlternativesStage(resp.result, links);
}

async function findLinksWithRootFallback(): Promise<PolicyLink[] | null> {
  const detected = detectSignupContext();
  if (detected === null) return null;
  if (detected.length > 0) return detected;

  // This page has a sign-up/login form but no Terms/Privacy link of its
  // own (common on identity-provider "enter your email" steps) — check
  // the site's root domain, where that link usually lives in the footer.
  if (location.pathname === "/") return [];
  const rootUrl = `${location.origin}/`;
  const rootResp = await sendToBackground({
    kind: "FETCH_POLICY_HTML",
    links: [{ label: "root", url: rootUrl }],
  });
  if (rootResp.kind !== "POLICY_HTML_FETCHED") return [];
  const [rootPage] = rootResp.pages;
  if (!rootPage || rootPage.error) return [];
  return parsePolicyLinksFromHtml(rootPage.html, rootUrl);
}

async function runSignupReview(links: PolicyLink[]) {
  showOverlay();
  renderStage(renderLinksFoundStage(links));

  const fetchResp = await sendToBackground({ kind: "FETCH_POLICY_HTML", links });
  if (fetchResp.kind === "ERROR") {
    renderStage(renderErrorStage(fetchResp.message));
    onAction("#close-error", () => hideOverlay());
    return;
  }
  if (fetchResp.kind !== "POLICY_HTML_FETCHED") return;

  const pages = fetchResp.pages;
  const brokenPages = pages.filter((p) => p.error);
  const okPages = pages.filter((p) => !p.error);
  const combinedText = okPages
    .map((p) => `--- ${p.label} (${p.url}) ---\n${extractTextFromHtml(p.html)}`)
    .join("\n\n");

  if (!combinedText.trim()) {
    // Every linked document 404'd/failed — the site's own consent flow is
    // broken, which is worth telling the user rather than a plain error.
    renderStage(renderAllLinksBrokenStage(brokenPages));
    onAction("#close-error", () => hideOverlay());
    return;
  }

  renderStage(renderReadingStage(pages));

  const analyseResp = await sendToBackground({ kind: "ANALYSE_TEXT", policyText: combinedText.slice(0, 12000) });
  if (analyseResp.kind === "ERROR") {
    renderStage(renderErrorStage(analyseResp.message));
    onAction("#close-error", () => hideOverlay());
    return;
  }
  if (analyseResp.kind === "ANALYSE_RESULT") renderResultStage(analyseResp.result, links, brokenPages);
}

let reviewStarted = false;
let checkScheduled = false;

/**
 * Sign-up forms are frequently client-rendered (React/SPA) and can also
 * change client-side without a real navigation (e.g. switching between
 * "student"/"teacher"/"personal account" panels on the same URL). A single
 * check at document_idle misses both cases, so keep re-checking on DOM
 * mutations for a while rather than only checking once.
 */
async function checkForSignupMoment() {
  if (reviewStarted) return;

  const links = await findLinksWithRootFallback();
  if (!links || links.length === 0) return; // keep watching — may appear after more rendering

  if (await hasBeenReviewed(links)) return; // these exact documents were already reviewed — stay quiet, but keep watching in case a different set of links appears later (e.g. another step in a multi-flow page)

  reviewStarted = true;
  observer.disconnect();
  await runSignupReview(links);
}

function scheduleCheck() {
  if (checkScheduled || reviewStarted) return;
  checkScheduled = true;
  setTimeout(() => {
    checkScheduled = false;
    checkForSignupMoment().catch((err) => console.error("[Privacy Guardian] signup check failed", err));
  }, 400);
}

const observer = new MutationObserver(scheduleCheck);
observer.observe(document.documentElement, { childList: true, subtree: true });

// Stop watching after a while — a sign-up moment that hasn't appeared by
// then is unlikely to, and there's no point observing a page forever.
setTimeout(() => observer.disconnect(), 30000);

scheduleCheck();
