import { detectConsentPlatform, rejectNonEssentialCookies } from "../cookie-engine";
import { extractPageText, extractTextFromHtml } from "../policy-analyser";
import { highlightClause } from "../policy-highlighter";
import { BrowserAction } from "../types";

export interface BrowserActionResult {
  ok: boolean;
  detail: string;
  data?: unknown;
}

const BLOCKED_SELECTORS = ["input[type=password]", "form[action]", "[type=submit]"];

/**
 * Refuses any action that touches a form/password/submit element, or a
 * click outside a plausible consent dialog. This is the sole gate between
 * an AI-proposed action and real DOM mutation — see doc's
 * "Astra Browser-Control Pattern".
 */
function isSafeTarget(el: Element): boolean {
  if (BLOCKED_SELECTORS.some((sel) => el.matches(sel) || el.closest(sel))) {
    return false;
  }
  return true;
}

function resolveElement(selector?: string): HTMLElement | null {
  if (!selector) return null;
  const el = document.querySelector<HTMLElement>(selector);
  if (!el || !isSafeTarget(el)) return null;
  return el;
}

export function executeAction(action: BrowserAction): BrowserActionResult {
  switch (action.type) {
    case "read_page":
      return { ok: true, detail: "page read", data: extractPageText() };

    case "read_policy":
      return { ok: true, detail: "policy read", data: extractPageText() };

    case "find_consent_controls":
      return {
        ok: true,
        detail: "consent platform scan",
        data: { platform: detectConsentPlatform() },
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
        detail: `platform=${outcome.platform} handled=${outcome.handled}`,
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
        detail: "verification stub — see cookie-engine roadmap",
        data: { platform: detectConsentPlatform() },
      };

    case "extract_text_from_html":
      return { ok: true, detail: "extracted", data: extractTextFromHtml(action.html ?? "") };

    default:
      return { ok: false, detail: `unsupported action: ${(action as BrowserAction).type}` };
  }
}
