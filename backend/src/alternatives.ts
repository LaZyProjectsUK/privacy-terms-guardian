import { z } from "zod";
import { askAstra } from "./astra";

export const PrivacyProfileSchema = z.object({
  noSaleOfData: z.boolean().default(true),
  noAdPartnerSharing: z.boolean().default(true),
  noMarketingEmailsUnlessRequested: z.boolean().default(true),
  noBehaviouralProfiling: z.boolean().default(true),
  essentialCookiesOnly: z.boolean().default(true),
  noAiTraining: z.boolean().default(false),
  minimalRetention: z.boolean().default(false),
  noCrossSiteTracking: z.boolean().default(true),
});
export type PrivacyProfile = z.infer<typeof PrivacyProfileSchema>;

export const AlternativeSchema = z.object({
  name: z.string(),
  url: z.string(),
  function: z.string(),
  privacyScore: z.number().min(0).max(100),
  notes: z.string(),
});
export type Alternative = z.infer<typeof AlternativeSchema>;

export const VerdictSchema = z.enum(["good_fit", "consider_alternatives"]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const AlternativesResultSchema = z.object({
  detectedService: z.string(),
  currentSiteScore: z.number().min(0).max(100),
  verdict: VerdictSchema,
  summary: z.string(),
  alternatives: z.array(AlternativeSchema),
});
export type AlternativesResult = z.infer<typeof AlternativesResultSchema>;

/** A response that's merely too long is a cosmetic problem, not a reason to fail the whole request — truncate instead of rejecting. */
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const ALTERNATIVES_INSTRUCTIONS = `You are Privacy & Terms Guardian's "Find Better" agent.

Given a description of a website/service and the user's privacy profile, identify the
service category and, if you can, name up to 3 real alternative services offering the
same or substantially similar function, ranked by fit against the user's stated preferences
(data sale, ad-partner sharing, marketing emails, profiling, cookies/tracking, retention).

Be terse. This is a quick verdict, not an essay:
- "detectedService" is a short label ONLY — the product/service name or category, 2-6 words
  (e.g. "Video conferencing", "Note-taking app"). Never a sentence, never a caveat or
  explanation. If you're unsure what it is, use your best short guess anyway.
- "verdict" is "good_fit" if the current site is already a reasonable privacy choice, or
  "consider_alternatives" if there are clearly better options.
- "summary" is ONE short plain sentence giving that verdict in context. No hedging, no
  multi-clause paragraphs.
- If you cannot confidently name real alternatives, return an empty "alternatives" array —
  do not invent fake companies, and do not pad "detectedService" with the caveat instead;
  put any caveat briefly in "summary".
- Each alternative's "notes" is ONE short clause (under 15 words), not a paragraph.

Respond with ONLY JSON matching:
{ "detectedService": string, "currentSiteScore": number 0-100,
  "verdict": "good_fit" | "consider_alternatives", "summary": string,
  "alternatives": [ { "name", "url", "function", "privacyScore" 0-100, "notes" } ] }`;

export async function findAlternatives(
  siteDescription: string,
  profile: PrivacyProfile
): Promise<AlternativesResult> {
  const input = JSON.stringify({ site: siteDescription, privacyProfile: profile });

  const raw = await askAstra({
    instructions: ALTERNATIVES_INSTRUCTIONS,
    input,
  });

  const parsed = AlternativesResultSchema.parse(JSON.parse(raw));

  return {
    ...parsed,
    detectedService: truncate(parsed.detectedService, 60),
    summary: truncate(parsed.summary, 160),
    alternatives: parsed.alternatives.slice(0, 3).map((a) => ({
      ...a,
      name: truncate(a.name, 60),
      function: truncate(a.function, 60),
      notes: truncate(a.notes, 140),
    })),
  };
}
