import { z } from "zod";
import { askAstra } from "./astra";

export const RiskLevel = z.enum(["concerning", "high_concern"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const RiskFindingSchema = z.object({
  level: RiskLevel,
  summary: z.string(),
});
export type RiskFinding = z.infer<typeof RiskFindingSchema>;

export const AnalysisResultSchema = z.object({
  findings: z.array(RiskFindingSchema),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

/** A response that's merely too long is a cosmetic problem, not a reason to fail the whole request — truncate instead of rejecting. */
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const ANALYSIS_INSTRUCTIONS = `You are Privacy & Terms Guardian. Nobody reads Privacy Policies or Terms
of Service — that's the whole problem this exists to fix. Do not solve it by producing another wall of
text nobody will read either.

Only report things that could actually disadvantage or harm the user: data sold/shared, surprise
marketing consent, profiling, weak retention/deletion rights, one-sided liability or auto-renewal terms,
AI-training use of their data, and reassuring headline statements ("we don't sell your data") that are
undermined by an exception elsewhere in the policy.

Hard rules:
- Skip anything ordinary/expected. If nothing meaningfully risky is present, return an empty list. Do not
  report a finding just to have something to say.
- Maximum 5 findings, ranked worst first. If there are more than 5 real issues, keep only the 5 worst.
- Each finding is ONE short plain sentence (under 20 words). No sub-clauses, no "however"/"in addition".
- Never quote or paste text from the policy. Say what it means, not what it says.
- "level" is "high_concern" only for something a reasonable user would want to know about before signing
  up; everything else worth surfacing is "concerning". Do not invent a third tier.

Respond with ONLY JSON matching: { "findings": [ { "level": "concerning"|"high_concern", "summary": string } ] }`;

export async function analysePolicy(policyText: string): Promise<AnalysisResult> {
  const raw = await askAstra({
    instructions: ANALYSIS_INSTRUCTIONS,
    input: policyText,
  });

  const parsed = AnalysisResultSchema.parse(JSON.parse(raw));
  return {
    findings: parsed.findings.slice(0, 5).map((f) => ({ ...f, summary: truncate(f.summary, 120) })),
  };
}
