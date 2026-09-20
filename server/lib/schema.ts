import { cleanText, unique } from "../utils/text.js";
import type { CompanyType, Filters, RubricItem } from "../types/domain.js";

const allowedCompanyTypes = new Set<CompanyType>(["startup", "scaleup", "enterprise", "agency"]);

export function normalizeFilters(input: unknown = {}): Filters {
  const source = isRecord(input) ? input : {};
  const minYears = numberOrNull(source.minYears);
  const maxYears = numberOrNull(source.maxYears);

  return {
    skills: normalizeStringArray(source.skills),
    minYears,
    maxYears: maxYears != null && minYears != null && maxYears < minYears ? minYears : maxYears,
    locations: normalizeStringArray(source.locations),
    companyTypes: normalizeStringArray(source.companyTypes)
      .map((type) => type.toLowerCase())
      .filter((type): type is CompanyType => allowedCompanyTypes.has(type as CompanyType)),
    titles: normalizeStringArray(source.titles),
  };
}

export function normalizeRubric(input: unknown): RubricItem[] {
  const rubric = Array.isArray(input) ? input : [];
  const normalized = rubric
    .map((item: unknown) => {
      const source = isRecord(item) ? item : {};
      return {
        name: cleanText(source.name),
        weight: clamp(Number(source.weight || 3), 1, 5),
        description: cleanText(source.description),
      };
    })
    .filter((item) => item.name && item.description);

  return normalized.length
    ? normalized
    : [{ name: "Role fit", weight: 5, description: "Candidate matches the stated role requirements." }];
}

export function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? unique(value.map(cleanText).filter(Boolean)) : [];
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
