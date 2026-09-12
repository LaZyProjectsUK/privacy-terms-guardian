export type RiskLevel = "concerning" | "high_concern";

export interface RiskFinding {
  level: RiskLevel;
  summary: string;
}

export interface AnalysisResult {
  findings: RiskFinding[];
}

export interface Alternative {
  name: string;
  url: string;
  function: string;
  privacyScore: number;
  notes: string;
}

export type Verdict = "good_fit" | "consider_alternatives";

export interface AlternativesResult {
  detectedService: string;
  currentSiteScore: number;
  verdict: Verdict;
  summary: string;
  alternatives: Alternative[];
}

export interface PrivacyProfile {
  noSaleOfData: boolean;
  noAdPartnerSharing: boolean;
  noMarketingEmailsUnlessRequested: boolean;
  noBehaviouralProfiling: boolean;
  essentialCookiesOnly: boolean;
  noAiTraining: boolean;
  minimalRetention: boolean;
  noCrossSiteTracking: boolean;
}

/**
 * Every browser action Astra can request. Extend this list (and the
 * validator in browser-tools) deliberately — it is the sole boundary
 * between AI decisions and real page interaction.
 */
export type BrowserActionType =
  | "read_page"
  | "read_policy"
  | "find_consent_controls"
  | "click_element"
  | "toggle_consent"
  | "scroll"
  | "open_page"
  | "highlight_clause"
  | "verify_consent_state"
  | "extract_text_from_html";

export interface BrowserAction {
  type: BrowserActionType;
  selector?: string;
  category?: string;
  text?: string;
  url?: string;
  /** Raw HTML for "extract_text_from_html" — background fetches bytes, content script (which has DOMParser) turns them into text. */
  html?: string;
}

export interface PolicyLinkRef {
  label: string;
  url: string;
}

export interface FetchedPage {
  label: string;
  url: string;
  html: string;
  error?: string;
}

export type RuntimeMessage =
  | { kind: "ANALYSE_PAGE" }
  | { kind: "ANALYSE_RESULT"; result: AnalysisResult }
  | { kind: "PROTECT_COOKIES" }
  | { kind: "PROTECT_RESULT"; verified: boolean; detail: string }
  | { kind: "FIND_BETTER" }
  | { kind: "FIND_BETTER_RESULT"; result: AlternativesResult }
  | { kind: "FETCH_POLICY_HTML"; links: PolicyLinkRef[] }
  | { kind: "POLICY_HTML_FETCHED"; pages: FetchedPage[] }
  | { kind: "ANALYSE_TEXT"; policyText: string }
  | { kind: "ERROR"; message: string };
