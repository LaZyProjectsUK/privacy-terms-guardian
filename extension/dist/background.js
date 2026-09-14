// src/config.ts
var BACKEND_URL = "https://privacy-terms-guardian.onrender.com/api";

// src/background.ts
function sendToContent(tabId, action) {
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
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");
  return tab;
}
async function resolveTab(senderTab) {
  if (senderTab?.id != null) return senderTab;
  return getActiveTab();
}
async function handleAnalysePage(tab) {
  const read = await sendToContent(tab.id, { type: "read_policy" });
  const policyText = String(read.data ?? "");
  const res = await fetch(`${BACKEND_URL}/analyse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ policyText })
  });
  if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
  const result = await res.json();
  for (const finding of result.findings ?? []) {
    await sendToContent(tab.id, { type: "highlight_clause", text: finding.sourceClause });
  }
  return { kind: "ANALYSE_RESULT", result };
}
async function handleProtectCookies(tab) {
  const toggled = await sendToContent(tab.id, { type: "toggle_consent" });
  const verified = await sendToContent(tab.id, { type: "verify_consent_state" });
  return {
    kind: "PROTECT_RESULT",
    verified: toggled.ok,
    detail: `${toggled.detail}; ${verified.detail}`
  };
}
async function gatherSiteContext(tab) {
  const parts = [`${tab.title ?? ""} \u2014 ${tab.url ?? ""}`];
  try {
    const read = await sendToContent(tab.id, { type: "read_page" });
    const pageText = String(read.data ?? "").trim();
    if (pageText) parts.push(pageText.slice(0, 1500));
  } catch {
  }
  try {
    const rootUrl = new URL(tab.url ?? "").origin + "/";
    if (rootUrl !== tab.url) {
      const res = await fetch(rootUrl);
      if (res.ok) {
        const html = await res.text();
        const extracted = await sendToContent(tab.id, { type: "extract_text_from_html", html });
        const rootText = String(extracted.data ?? "").trim();
        if (rootText) parts.push(rootText.slice(0, 1500));
      }
    }
  } catch {
  }
  return parts.join("\n\n");
}
async function handleFindBetter(tab) {
  const siteDescription = await gatherSiteContext(tab);
  const res = await fetch(`${BACKEND_URL}/alternatives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siteDescription })
  });
  if (!res.ok) throw new Error(`Find Better failed: ${res.status}`);
  const result = await res.json();
  return { kind: "FIND_BETTER_RESULT", result };
}
async function handleFetchPolicyHtml(links) {
  const pages = await Promise.all(
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
async function handleAnalyseText(policyText) {
  const res = await fetch(`${BACKEND_URL}/analyse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ policyText })
  });
  if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
  const result = await res.json();
  return { kind: "ANALYSE_RESULT", result };
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const respond = (promise) => {
    promise.then(sendResponse).catch((err) => sendResponse({ kind: "ERROR", message: String(err) }));
    return true;
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
//# sourceMappingURL=background.js.map
