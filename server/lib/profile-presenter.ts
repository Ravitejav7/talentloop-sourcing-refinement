import type { Profile, ScoredProfile } from "../types/domain.js";

export function compactProfile(profile: Profile | ScoredProfile) {
  return {
    id: profile.id,
    name: profile.name,
    current_title: profile.current_title,
    years_experience: profile.years_experience,
    location: profile.location,
    current_company: profile.current_company,
    current_company_type: profile.current_company_type,
    skills: profile.skills,
    past_companies: profile.past_companies,
    education: profile.education,
    summary: profile.summary,
    score: "score" in profile ? profile.score : undefined,
    explanation: "explanation" in profile ? profile.explanation : undefined,
  };
}
