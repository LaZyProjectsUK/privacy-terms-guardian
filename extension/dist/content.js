// src/cookie-engine/index.ts
function queryText(selectors, text) {
  for (const selector of selectors) {
    const els = Array.from(document.querySelectorAll(selector));
    const match = els.find((el) => text.test(el.textContent ?? ""));
    if (match) return match;
  }
  return null;
}
var REJECT_TEXT = /reject all|decline all|necessary only|reject non-essential/i;
var handlers = [
  {
    platform: "OneTrust",
    detect: () => !!document.getElementById("onetrust-banner-sdk"),
    rejectAll: () => {
      const btn = document.getElementById("onetrust-reject-all-handler");
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }
  },
  {
    platform: "Cookiebot",
    detect: () => !!document.getElementById("CybotCookiebotDialog"),
    rejectAll: () => {
      const btn = document.getElementById("CybotCookiebotDialogBodyButtonDecline");
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }
  },
  {
    platform: "generic-reject-all-button",
    detect: () => !!queryText(["button", "a[role=button]"], REJECT_TEXT),
    rejectAll: () => {
      const btn = queryText(["button", "a[role=button]"], REJECT_TEXT);
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }
  }
];
function detectConsentPlatform() {
  return handlers.find((h) => h.detect())?.platform ?? null;
}
function rejectNonEssentialCookies() {
  for (const handler of handlers) {
    if (handler.detect()) {
      const handled = handler.rejectAll();
      return { handled, platform: handler.platform, verified: false };
    }
  }
  return { handled: false, platform: "unknown", verified: false };
}

// src/policy-analyser/index.ts
function extractPageText() {
  const main = document.querySelector("main, article") ?? document.body;
  return (main.innerText ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function extractTextFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript, template, svg").forEach((el) => el.remove());
  const main = doc.querySelector("main, article") ?? doc.body;
  return (main?.textContent ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// src/policy-highlighter/index.ts
var HIGHLIGHT_CLASS = "privacy-guardian-highlight";
function highlightClause(clause) {
  const needle = clause.slice(0, 80).trim();
  if (!needle) return false;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent ?? "";
    const index = text.indexOf(needle);
    if (index === -1) continue;
    const range = document.createRange();
    range.setStart(node, index);
    range.setEnd(node, Math.min(index + needle.length, text.length));
    const mark = document.createElement("mark");
    mark.className = HIGHLIGHT_CLASS;
    mark.style.backgroundColor = "#ffe08a";
    range.surroundContents(mark);
    mark.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
  }
  return false;
}

// src/browser-tools/index.ts
var BLOCKED_SELECTORS = ["input[type=password]", "form[action]", "[type=submit]"];
function isSafeTarget(el) {
  if (BLOCKED_SELECTORS.some((sel) => el.matches(sel) || el.closest(sel))) {
    return false;
  }
  return true;
}
function resolveElement(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el || !isSafeTarget(el)) return null;
  return el;
}
function executeAction(action) {
  switch (action.type) {
    case "read_page":
      return { ok: true, detail: "page read", data: extractPageText() };
    case "read_policy":
      return { ok: true, detail: "policy read", data: extractPageText() };
    case "find_consent_controls":
      return {
        ok: true,
        detail: "consent platform scan",
        data: { platform: detectConsentPlatform() }
      };
    case "click_element": {
      const el = resolveElement(action.selector);
      if (!el) return { ok: false, detail: "target missing or blocked" };
      el.click();
      return { ok: true, detail: `clicked ${action.selector}` };
    }
    case "toggle_consent": {
      const outcome = rejectNonEssentialCookies();
      return {
        ok: outcome.handled,
        detail: `platform=${outcome.platform} handled=${outcome.handled}`
      };
    }
    case "scroll": {
      const el = resolveElement(action.selector);
      (el ?? document.body).scrollIntoView({ behavior: "smooth", block: "center" });
      return { ok: true, detail: "scrolled" };
    }
    case "open_page":
      if (!action.url) return { ok: false, detail: "url required" };
      window.open(action.url, "_blank", "noopener,noreferrer");
      return { ok: true, detail: `opened ${action.url}` };
    case "highlight_clause":
      if (!action.text) return { ok: false, detail: "text required" };
      return { ok: highlightClause(action.text), detail: "highlight attempted" };
    case "verify_consent_state":
      return {
        ok: true,
        detail: "verification stub \u2014 see cookie-engine roadmap",
        data: { platform: detectConsentPlatform() }
      };
    case "extract_text_from_html":
      return { ok: true, detail: "extracted", data: extractTextFromHtml(action.html ?? "") };
    default:
      return { ok: false, detail: `unsupported action: ${action.type}` };
  }
}

// src/overlay/index.ts
var HOST_ID = "privacy-guardian-overlay-host";
var STYLES = `
  :host { all: initial; }
  .backdrop {
    position: fixed; inset: 0; z-index: 2147483647;
    background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  }
  .card {
    width: min(560px, 92vw); max-height: 82vh; overflow-y: auto;
    background: #1c1c1e; color: #f2f2f2; border-radius: 14px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    padding: 20px 22px;
  }
  .header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .header h1 { font-size: 15px; margin: 0; font-weight: 600; }
  .stage-label { font-size: 12px; color: #9aa0a6; margin-bottom: 12px; }
  .spinner {
    display: inline-block; width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid #555; border-top-color: #f2f2f2;
    animation: spin 0.8s linear infinite; margin-right: 6px; vertical-align: -2px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .text-preview {
    background: #111; border-radius: 8px; padding: 10px 12px; font-size: 12px;
    line-height: 1.5; max-height: 220px; overflow-y: auto; white-space: pre-wrap;
    color: #c7c7c7; margin-bottom: 8px;
  }
  .findings-list { padding-left: 16px; margin: 0; font-size: 13px; line-height: 1.6; }
  .findings-list li { margin-bottom: 10px; }
  .clause { color: #9aa0a6; font-style: italic; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #333; }
  .footer { display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end; }
  button {
    font: inherit; font-size: 13px; padding: 8px 14px; border-radius: 8px;
    border: 1px solid #444; background: #2c2c2e; color: #f2f2f2; cursor: pointer;
  }
  button.primary { background: #f2f2f2; color: #111; border-color: #f2f2f2; }
  button:hover { filter: brightness(1.1); }
  .links { font-size: 12px; color: #9aa0a6; margin-bottom: 4px; }
`;
var hostEl = null;
var shadow = null;
var bodyEl = null;
function ensureMounted() {
  if (hostEl) return;
  hostEl = document.createElement("div");
  hostEl.id = HOST_ID;
  document.documentElement.appendChild(hostEl);
  shadow = hostEl.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = STYLES;
  shadow.appendChild(style);
  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  shadow.appendChild(backdrop);
  const card = document.createElement("div");
  card.className = "card";
  backdrop.appendChild(card);
  const header = document.createElement("div");
  header.className = "header";
  header.innerHTML = `<h1>\u{1F6E1}\uFE0F Privacy & Terms Guardian</h1>`;
  card.appendChild(header);
  bodyEl = document.createElement("div");
  bodyEl.id = "guardian-body";
  card.appendChild(bodyEl);
}
function showOverlay() {
  ensureMounted();
}
function hideOverlay() {
  hostEl?.remove();
  hostEl = null;
  shadow = null;
  bodyEl = null;
}
function renderStage(html) {
  ensureMounted();
  if (bodyEl) bodyEl.innerHTML = html;
}
function onAction(selector, handler) {
  shadow?.querySelectorAll(selector).forEach((el) => {
    el.addEventListener("click", () => handler(el), { once: true });
  });
}

// src/signup-detector/index.ts
var POLICY_TEXT = /terms(\s+(of\s+(service|use)|and\s+conditions))?|privacy(\s+policy)?|conditions\s+of\s+use/i;
function detectSignupContext() {
  const links = findPolicyLinks(document, location.href);
  if (document.querySelector('input[type="password"]')) {
    return links;
  }
  if (links.length > 0 && hasCheckboxNearAnyLink(links)) {
    return links;
  }
  return null;
}
function hasCheckboxNearAnyLink(links) {
  const linkUrls = new Set(links.map((l) => l.url));
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
  return checkboxes.some((cb) => {
    const container = cb.closest("label, li, fieldset, p, div");
    if (!container) return false;
    return Array.from(container.querySelectorAll("a[href]")).some((a) => linkUrls.has(a.href));
  });
}
function findPolicyLinks(root, currentUrl) {
  const currentNoHash = currentUrl.split("#")[0];
  const anchors = Array.from(root.querySelectorAll("a[href]"));
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  for (const a of anchors) {
    const label = (a.textContent ?? "").trim();
    if (!label || !POLICY_TEXT.test(label)) continue;
    const raw = a.getAttribute("href");
    if (!raw || raw.trim().toLowerCase().startsWith("javascript:")) continue;
    let resolved;
    try {
      resolved = new URL(raw, currentUrl).href;
    } catch {
      continue;
    }
    if (resolved.split("#")[0] === currentNoHash) continue;
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    results.push({ label, url: resolved });
  }
  return results;
}
function parsePolicyLinksFromHtml(html, baseUrl) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return findPolicyLinks(doc, baseUrl);
}

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

// src/content.ts
function reviewedKey(links) {
  const docs = links.map((l) => l.url).sort().join("|");
  return `guardian:reviewed:${docs}`;
}
async function hasBeenReviewed(links) {
  const key = reviewedKey(links);
  const stored = await chrome.storage.local.get(key);
  return !!stored[key];
}
function markReviewed(links) {
  chrome.storage.local.set({ [reviewedKey(links)]: { at: Date.now() } });
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.kind !== "EXECUTE_ACTION") return false;
  sendResponse(executeAction(message.action));
  return false;
});
function sendToBackground(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ kind: "ERROR", message: chrome.runtime.lastError.message ?? "unknown error" });
        return;
      }
      resolve(response ?? { kind: "ERROR", message: "no response from background" });
    });
  });
}
function escapeHtml2(input) {
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
}
function renderLinksFoundStage(links) {
  const items = links.map((l) => `<div class="links">\u{1F4C4} ${escapeHtml2(l.label)}</div>`).join("");
  return `
    <div class="stage-label"><span class="spinner"></span>Found ${links.length} policy link(s) on this page. Reading them before you sign up\u2026</div>
    ${items}`;
}
function renderReadingStage(pages) {
  const items = pages.map(
    (p) => p.error ? `<div class="links">\u26A0\uFE0F ${escapeHtml2(p.label)} \u2014 couldn't read it</div>` : `<div class="links">\u2705 ${escapeHtml2(p.label)} read</div>`
  ).join("");
  return `
    ${items}
    <div class="stage-label"><span class="spinner"></span>Checking for anything that could hurt you\u2026</div>`;
}
function renderErrorStage(message) {
  return `
    <div class="stage-label">Something went wrong: ${escapeHtml2(message)}</div>
    <div class="footer"><button class="primary" id="close-error">Close</button></div>`;
}
function renderBrokenLinksNote(brokenPages) {
  const items = brokenPages.map((p) => `<li>\u{1F534} ${escapeHtml2(p.label)} link is broken (${escapeHtml2(p.error ?? "failed to load")})</li>`).join("");
  return `<ul style="padding-left:18px; margin:0 0 10px;">${items}</ul>`;
}
function renderAllLinksBrokenStage(brokenPages) {
  return `
    <div class="stage-label">\u{1F534} This site links to its own Terms/Privacy Policy, but the link${brokenPages.length > 1 ? "s don't" : " doesn't"} work:</div>
    ${renderBrokenLinksNote(brokenPages)}
    <div class="footer"><button class="primary" id="close-error">Close</button></div>`;
}
function renderResultStage(result, links, brokenPages = []) {
  renderStage(`
    ${brokenPages.length > 0 ? renderBrokenLinksNote(brokenPages) : ""}
    ${renderAnalysis(result)}
    <div class="footer">
      <button id="find-better">Not happy \u2014 Find Better</button>
      <button class="primary" id="continue">Continue anyway</button>
    </div>`);
  onAction("#continue", () => {
    markReviewed(links);
    hideOverlay();
  });
  onAction("#find-better", () => runFindBetter(links));
}
function renderAlternativesStage(result, links) {
  renderStage(`
    ${renderAlternatives(result)}
    <div class="footer"><button class="primary" id="close">Close</button></div>`);
  onAction("#close", () => {
    markReviewed(links);
    hideOverlay();
  });
}
async function runFindBetter(links) {
  renderStage(`<div class="stage-label"><span class="spinner"></span>Looking for better alternatives\u2026</div>`);
  const resp = await sendToBackground({ kind: "FIND_BETTER" });
  if (resp.kind === "ERROR") {
    renderStage(renderErrorStage(resp.message));
    onAction("#close-error", () => hideOverlay());
    return;
  }
  if (resp.kind === "FIND_BETTER_RESULT") renderAlternativesStage(resp.result, links);
}
async function findLinksWithRootFallback() {
  const detected = detectSignupContext();
  if (detected === null) return null;
  if (detected.length > 0) return detected;
  if (location.pathname === "/") return [];
  const rootUrl = `${location.origin}/`;
  const rootResp = await sendToBackground({
    kind: "FETCH_POLICY_HTML",
    links: [{ label: "root", url: rootUrl }]
  });
  if (rootResp.kind !== "POLICY_HTML_FETCHED") return [];
  const [rootPage] = rootResp.pages;
  if (!rootPage || rootPage.error) return [];
  return parsePolicyLinksFromHtml(rootPage.html, rootUrl);
}
async function runSignupReview(links) {
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
  const combinedText = okPages.map((p) => `--- ${p.label} (${p.url}) ---
${extractTextFromHtml(p.html)}`).join("\n\n");
  if (!combinedText.trim()) {
    renderStage(renderAllLinksBrokenStage(brokenPages));
    onAction("#close-error", () => hideOverlay());
    return;
  }
  renderStage(renderReadingStage(pages));
  const analyseResp = await sendToBackground({ kind: "ANALYSE_TEXT", policyText: combinedText.slice(0, 12e3) });
  if (analyseResp.kind === "ERROR") {
    renderStage(renderErrorStage(analyseResp.message));
    onAction("#close-error", () => hideOverlay());
    return;
  }
  if (analyseResp.kind === "ANALYSE_RESULT") renderResultStage(analyseResp.result, links, brokenPages);
}
var reviewStarted = false;
var checkScheduled = false;
async function checkForSignupMoment() {
  if (reviewStarted) return;
  const links = await findLinksWithRootFallback();
  if (!links || links.length === 0) return;
  if (await hasBeenReviewed(links)) return;
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
var observer = new MutationObserver(scheduleCheck);
observer.observe(document.documentElement, { childList: true, subtree: true });
setTimeout(() => observer.disconnect(), 3e4);
scheduleCheck();
//# sourceMappingURL=content.js.map
