import { normalizeTerm } from "../utils/text.js";
import type { CompanyType, Filters, Profile } from "../types/domain.js";

export function applyFilters(profiles: Profile[], filters: Filters): Profile[] {
  return profiles.filter((profile) => {
    const skills = profile.skills.map(normalizeTerm);
    const title = normalizeTerm(profile.current_title);
    const location = normalizeTerm(profile.location);
    const companyTypes = [
      profile.current_company_type,
      ...profile.past_companies.map((company) => company.company_type),
    ];

    return (
      matchesAny(filters.skills, skills) &&
      matchesMinYears(profile, filters) &&
      matchesMaxYears(profile, filters) &&
      matchesAny(filters.locations, [location]) &&
      matchesCompanyType(filters.companyTypes, companyTypes) &&
      matchesTitle(filters.titles, title)
    );
  });
}

function matchesAny(filters: string[], values: string[]): boolean {
  if (filters.length === 0) return true;
  return filters.some((filterValue) =>
    values.some((value) => value.includes(normalizeTerm(filterValue))),
  );
}

function matchesCompanyType(filters: CompanyType[], companyTypes: CompanyType[]): boolean {
  if (filters.length === 0) return true;
  return filters.some((type) => companyTypes.includes(type));
}

function matchesTitle(filters: string[], title: string): boolean {
  if (filters.length === 0) return true;

  const titleTokens = new Set(tokenizeTitle(title));
  return filters.some((filterValue) =>
    tokenizeTitle(filterValue).some((token) => titleTokens.has(token)),
  );
}

function tokenizeTitle(value: string): string[] {
  const roleSynonyms: Record<string, string> = {
    developer: "engineer",
    dev: "engineer",
    dba: "database",
  };

  const ignoredTokens = new Set(["rds", "aws", "senior", "sr", "lead", "principal"]);

  return normalizeTerm(value)
    .split(/[^a-z0-9]+/)
    .map((token) => roleSynonyms[token] || token)
    .filter((token) => token.length > 2 && !ignoredTokens.has(token));
}

function matchesMinYears(profile: Profile, filters: Filters): boolean {
  return filters.minYears == null || profile.years_experience >= filters.minYears;
}

function matchesMaxYears(profile: Profile, filters: Filters): boolean {
  return filters.maxYears == null || profile.years_experience <= filters.maxYears;
}
