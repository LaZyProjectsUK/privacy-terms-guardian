/**
 * Deterministic cookie-consent handling for known CMPs. AI should only be
 * consulted (via browser-tools' find_consent_controls) when none of these
 * match — see the doc's "Cookie Automation Strategy".
 */

export interface ConsentOutcome {
  handled: boolean;
  platform: string;
  verified: boolean;
}

type Handler = {
  platform: string;
  /** Quick check that this CMP is present on the page. */
  detect: () => boolean;
  /** Reject all non-essential cookies, return true if an action was taken. */
  rejectAll: () => boolean;
};

function queryText(selectors: string[], text: RegExp): HTMLElement | null {
  for (const selector of selectors) {
    const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const match = els.find((el) => text.test(el.textContent ?? ""));
    if (match) return match;
  }
  return null;
}

const REJECT_TEXT = /reject all|decline all|necessary only|reject non-essential/i;

const handlers: Handler[] = [
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
    },
  },
  {
    platform: "Cookiebot",
    detect: () => !!document.getElementById("CybotCookiebotDialog"),
    rejectAll: () => {
      const btn = document.getElementById("CybotCookiebotDialogBodyButtonDecline");
      if (btn) {
        (btn as HTMLElement).click();
        return true;
      }
      return false;
    },
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
    },
  },
];

export function detectConsentPlatform(): string | null {
  return handlers.find((h) => h.detect())?.platform ?? null;
}

/**
 * Attempts deterministic rejection. Returns handled:false when no known
 * handler matches — callers should fall back to the AI-assisted path.
 */
export function rejectNonEssentialCookies(): ConsentOutcome {
  for (const handler of handlers) {
    if (handler.detect()) {
      const handled = handler.rejectAll();
      return { handled, platform: handler.platform, verified: false };
    }
  }
  return { handled: false, platform: "unknown", verified: false };
}
