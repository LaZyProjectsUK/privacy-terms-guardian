import { PrivacyProfile, PrivacyProfileSchema } from "./alternatives";

/**
 * In-memory profile store for the MVP. Replace with a real database once
 * accounts/auth are added — see README roadmap.
 */
const profiles = new Map<string, PrivacyProfile>();

export function getProfile(userId: string): PrivacyProfile {
  return profiles.get(userId) ?? PrivacyProfileSchema.parse({});
}

export function saveProfile(userId: string, input: unknown): PrivacyProfile {
  const profile = PrivacyProfileSchema.parse(input);
  profiles.set(userId, profile);
  return profile;
}
