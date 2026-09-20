import { clamp, normalizeStringArray } from "./schema.js";
import { normalizeTerm } from "../utils/text.js";
import type { Filters, Profile, RubricItem, ScoredProfile } from "../types/domain.js";

type LlmScore = {
  id?: unknown;
  score?: unknown;
  explanation?: unknown;
  evidence?: unknown;
};

type ScoreWithFallbackInput = {
  batch: Profile[];
  scores: unknown;
  filters: Filters;
  rubric: RubricItem[];
};

export function scoreWithFallback({
  batch,
  scores,
  filters,
  rubric,
}: ScoreWithFallbackInput): ScoredProfile[] {
  const scored: ScoredProfile[] = [];
  const safeScores = Array.isArray(scores) ? scores : [];

  for (const score of safeScores as LlmScore[]) {
    const profile = batch.find((candidate) => candidate.id === score.id);
    if (!profile) continue;

    scored.push({
      ...profile,
      score: clamp(Number(score.score), 0, 100),
      explanation: cleanExplanation(score.explanation) || fallbackExplanation(profile),
      evidence: normalizeStringArray(score.evidence).slice(0, 4),
    });
  }

  const missingProfiles = batch.filter(
    (profile) => !scored.some((scoredProfile) => scoredProfile.id === profile.id),
  );

  return [
    ...scored,
    ...missingProfiles.map((profile) => ({
      ...profile,
      score: deterministicScore(profile, filters, rubric),
      explanation: fallbackExplanation(profile),
      evidence: fallbackEvidence(profile),
    })),
  ];
}

function cleanExplanation(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function fallbackExplanation(profile: Profile): string {
  return `${profile.name} is a ${profile.current_title} in ${profile.location} with ${profile.years_experience} years of experience and skills including ${profile.skills.slice(0, 3).join(", ")}.`;
}

function fallbackEvidence(profile: Profile): string[] {
  return [
    `${profile.years_experience} years experience`,
    `${profile.location}`,
    `${profile.current_company_type} background at ${profile.current_company}`,
    `Skills: ${profile.skills.slice(0, 3).join(", ")}`,
  ];
}

function deterministicScore(profile: Profile, filters: Filters, rubric: RubricItem[]): number {
  let score = 45;
  score += Math.min(profile.skills.length, 6) * 3;
  if (filters.locations.some((location) => normalizeTerm(profile.location).includes(normalizeTerm(location)))) {
    score += 10;
  }
  if (filters.companyTypes.includes(profile.current_company_type)) {
    score += 10;
  }
  if (rubric.length > 2) {
    score += 5;
  }
  return clamp(score, 0, 88);
}
