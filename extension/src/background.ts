import { BACKEND_URL } from "./config";
import { BrowserAction, FetchedPage, PolicyLinkRef, RuntimeMessage } from "./types";

/** Sends a validated action to the content script running in `tabId`. */
function sendToContent(tabId: number, action: BrowserAction): Promise<{ ok: boolean; detail: string; data?: unknown }> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { kind: "EXECUTE_ACTION", action }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");
  return tab;
}

/**
 * When a request comes from a content script (the on-page overlay), we
 * already know exactly which tab triggered it via the message sender —
 * use that rather than querying "the active tab in the current window",
 * which reflects real OS-level window focus and can silently resolve to
 * a completely different tab (e.g. another Chrome window the user has
 * open) than the one that actually asked. Only the popup/side panel (not
 * a content script, so no sender.tab) needs the active-tab query at all.
 */
async function resolveTab(senderTab?: chrome.tabs.Tab): Promise<chrome.tabs.Tab> {
  if (senderTab?.id != null) return senderTab;
  return getActiveTab();
}

async function handleAnalysePage(tab: chrome.tabs.Tab): Promise<RuntimeMessage> {
  const read = await sendToContent(tab.id!, { type: "read_policy" });
  const policyText = String(read.data ?? "");

  const res = await fetch(`${BACKEND_URL}/analyse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ policyText }),
  });
  if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
  const result = await res.json();

  for (const finding of result.findings ?? []) {
    await sendToContent(tab.id!, { type: "highlight_clause", text: finding.sourceClause });
  }

  return { kind: "ANALYSE_RESULT", result };
}

async function handleProtectCookies(tab: chrome.tabs.Tab): Promise<RuntimeMessage> {
  const toggled = await sendToContent(tab.id!, { type: "toggle_consent" });
  const verified = await sendToContent(tab.id!, { type: "verify_consent_state" });

  return {
    kind: "PROTECT_RESULT",
    verified: toggled.ok,
    detail: `${toggled.detail}; ${verified.detail}`,
  };
}

/**
 * A tab title + URL alone ("Sign in — https://x.com/login") rarely says
 * what a service actually does, so Astra has nothing to reason about and
 * plays it safe with a generic non-answer. Ground it in real content
 * instead: the current page's own visible text, plus the site's homepage
 * (which usually carries the actual marketing description) when it's a
 * different page. Both go through the content script for extraction,
 * since only it has DOMParser (background is a service worker).
 */
async function gatherSiteContext(tab: chrome.tabs.Tab): Promise<string> {
  const parts: string[] = [`${tab.title ?? ""} — ${tab.url ?? ""}`];

  try {
    const read = await sendToContent(tab.id!, { type: "read_page" });
    const pageText = String(read.data ?? "").trim();
    if (pageText) parts.push(pageText.slice(0, 1500));
  } catch {
    // fine — we still have the title/url
  }

  try {
    const rootUrl = new URL(tab.url ?? "").origin + "/";
    if (rootUrl !== tab.url) {
      const res = await fetch(rootUrl);
      if (res.ok) {
        const html = await res.text();
        const extracted = await sendToContent(tab.id!, { type: "extract_text_from_html", html });
        const rootText = String(extracted.data ?? "").trim();
        if (rootText) parts.push(rootText.slice(0, 1500));
      }
    }
  } catch {
    // fine — homepage fetch is a bonus, not a requirement
  }

  return parts.join("\n\n");
}

async function handleFindBetter(tab: chrome.tabs.Tab): Promise<RuntimeMessage> {
  const siteDescription = await gatherSiteContext(tab);

  const res = await fetch(`${BACKEND_URL}/alternatives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siteDescription }),
  });
  if (!res.ok) throw new Error(`Find Better failed: ${res.status}`);
  const result = await res.json();

  return { kind: "FIND_BETTER_RESULT", result };
}

/**
 * Fetches linked Terms/Privacy pages the user hasn't navigated to yet.
 * Only the background context is exempt from page CORS/Private-Network
 * restrictions, so this can't be done from the content script directly.
 */
async function handleFetchPolicyHtml(links: PolicyLinkRef[]): Promise<RuntimeMessage> {
  const pages: FetchedPage[] = await Promise.all(
    links.map(async (link) => {
      try {
        const res = await fetch(link.url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const html = await res.text();
        return { label: link.label, url: link.url, html };
      } catch (err) {
        return { label: link.label, url: link.url, html: "", error: String(err) };
      }
    })
  );
  return { kind: "POLICY_HTML_FETCHED", pages };
}

async function handleAnalyseText(policyText: string): Promise<RuntimeMessage> {
  const res = await fetch(`${BACKEND_URL}/analyse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ policyText }),
  });
  if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
  const result = await res.json();
  return { kind: "ANALYSE_RESULT", result };
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  const respond = (promise: Promise<RuntimeMessage>) => {
    promise
      .then(sendResponse)
      .catch((err) => sendResponse({ kind: "ERROR", message: String(err) }));
    return true; // keep the message channel open for the async response
  };

  switch (message.kind) {
    case "ANALYSE_PAGE":
      return respond(resolveTab(sender.tab).then(handleAnalysePage));
    case "PROTECT_COOKIES":
      return respond(resolveTab(sender.tab).then(handleProtectCookies));
    case "FIND_BETTER":
      return respond(resolveTab(sender.tab).then(handleFindBetter));
    case "FETCH_POLICY_HTML":
      return respond(handleFetchPolicyHtml(message.links));
    case "ANALYSE_TEXT":
      return respond(handleAnalyseText(message.policyText));
    default:
      return false;
  }
});
