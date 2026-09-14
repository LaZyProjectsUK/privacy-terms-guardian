export interface PolicyLink {
  label: string;
  url: string;
}

const POLICY_TEXT = /terms(\s+(of\s+(service|use)|and\s+conditions))?|privacy(\s+policy)?|conditions\s+of\s+use/i;

/**
 * Heuristic: a page is a "sign-up/agreement" moment if it has a password
 * field or a submit-shaped button, AND it links out to Terms/Privacy pages
 * (the classic "By continuing you agree to our Terms and Privacy Policy").
 * This is what should trigger the review overlay — not just any page that
 * happens to link to /privacy somewhere in its footer.
 */
/**
 * Returns null if this isn't a sign-up/login moment at all. Returns an
 * (possibly empty) array of policy links otherwise — an empty array means
 * "this looks like a sign-up page but has no Terms/Privacy link itself",
 * which is the signal to fall back to the site's root domain.
 */
export function detectSignupContext(): PolicyLink[] | null {
  const links = findPolicyLinks(document, location.href);

  // Strong signal: a real password field — this is a sign-up/sign-in form
  // even if it has no policy link of its own (root-domain fallback handles
  // that case). Deliberately NOT "any submit-shaped button on the page" —
  // that used to also match ordinary content pages that happen to have an
  // unrelated form (newsletter signup, search, comments) elsewhere on the
  // page, combined with a routine footer Privacy Policy link, firing the
  // overlay on pages with no actual sign-up/consent moment at all.
  if (document.querySelector('input[type="password"]')) {
    return links;
  }

  // Weaker signal: no password field here, but a checkbox sitting right
  // next to one of the links we found — the classic "I certify... as
  // described in the Terms of Service" consent pattern (e.g. Tinkercad's
  // Teacher Agreement, which has no password field and its "I agree"
  // button is type="button", not "submit"). Only counts when a real link
  // is actually nearby, so an unrelated checkbox elsewhere on the page
  // doesn't trigger anything.
  if (links.length > 0 && hasCheckboxNearAnyLink(links)) {
    return links;
  }

  return null;
}

function hasCheckboxNearAnyLink(links: PolicyLink[]): boolean {
  const linkUrls = new Set(links.map((l) => l.url));
  const checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
  return checkboxes.some((cb) => {
    const container = cb.closest("label, li, fieldset, p, div");
    if (!container) return false;
    return Array.from(container.querySelectorAll<HTMLAnchorElement>("a[href]")).some((a) => linkUrls.has(a.href));
  });
}

/**
 * currentUrl is whatever page `root` represents — the live document's own
 * URL, or (when root is a DOMParser'd document fetched from elsewhere) that
 * page's URL. Anchors pointing at currentUrl itself (ignoring #fragment)
 * are same-page anchors/accordion toggles, not real linked-out documents —
 * e.g. an in-page "Privacy and security" accordion section is NOT a link
 * to an actual Privacy Policy, and fetching it just re-reads the same page.
 */
export function findPolicyLinks(root: ParentNode, currentUrl: string): PolicyLink[] {
  const currentNoHash = currentUrl.split("#")[0];
  const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"));
  const seen = new Set<string>();
  const results: PolicyLink[] = [];

  for (const a of anchors) {
    const label = (a.textContent ?? "").trim();
    if (!label || !POLICY_TEXT.test(label)) continue;

    // Resolve the raw attribute against currentUrl ourselves, rather than
    // reading the browser-resolved `a.href`. `a.href` on a live document
    // resolves against document.baseURI, which is exactly what we'd need
    // a <base> tag for on a fetched/detached document — but inserting a
    // <base> element is blocked by a page's own `base-uri` CSP directive
    // even inside an unrelated DOMParser document. Plain URL resolution
    // sidesteps that entirely and needs no <base> element at all.
    const raw = a.getAttribute("href");
    if (!raw || raw.trim().toLowerCase().startsWith("javascript:")) continue;

    let resolved: string;
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

/**
 * Parses policy links out of HTML fetched from elsewhere (e.g. the site's
 * root domain), resolving relative hrefs against that page's real URL
 * rather than the current page's.
 */
export function parsePolicyLinksFromHtml(html: string, baseUrl: string): PolicyLink[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return findPolicyLinks(doc, baseUrl);
}
