import { applyFilters } from "../lib/filter-engine.js";
import { scoreWithFallback } from "../lib/scoring.js";
import { compactProfile } from "../lib/profile-presenter.js";
import { normalizeFilters, normalizeRubric, normalizeStringArray } from "../lib/schema.js";
import { cleanText, unique } from "../utils/text.js";
import { AppError } from "../utils/app-error.js";
import type {
  CandidateDecision,
  CompanyType,
  Filters,
  LlmProvider,
  Profile,
  RubricItem,
  ScoredProfile,
  SearchState,
} from "../types/domain.js";

const allowedCompanyTypes: CompanyType[] = ["startup", "scaleup", "enterprise", "agency"];

type PromptMap = Record<"generate-search" | "score-profiles" | "refine-search", string>;

type SearchServiceDependencies = {
  profiles: Profile[];
  prompts: PromptMap;
  llmProvider: LlmProvider;
};

type RerunInput = {
  requirement: unknown;
  filters: unknown;
  rubric: unknown;
};

type RefineInput = RerunInput & {
  feedback?: unknown;
  shownProfiles?: unknown;
  decisions?: unknown;
};

type FreezeInput = RerunInput & {
  rankedProfiles?: unknown;
};

type RunSearchInput = {
  requirement: string;
  filters: unknown;
  rubric: unknown;
  changes: string[];
};

type GenerateSearchResponse = {
  filters?: unknown;
  rubric?: unknown;
  summary?: unknown;
};

type RefineSearchResponse = {
  filters?: unknown;
  rubric?: unknown;
  changes?: unknown;
};

type ScoreProfilesResponse = {
  scores?: unknown;
};

export class SearchService {
  private readonly profiles: Profile[];
  private readonly prompts: PromptMap;
  private readonly llmProvider: LlmProvider;

  constructor({ profiles, prompts, llmProvider }: SearchServiceDependencies) {
    this.profiles = profiles;
    this.prompts = prompts;
    this.llmProvider = llmProvider;
  }

  async start(requirement: unknown): Promise<SearchState> {
    const cleanRequirement = this.requireRequirement(requirement);
    const generated = await this.generateSearch(cleanRequirement);

    return this.runSearch({
      requirement: cleanRequirement,
      filters: generated.filters,
      rubric: generated.rubric,
      changes: [generated.summary],
    });
  }

  async rerun({ requirement, filters, rubric }: RerunInput): Promise<SearchState> {
    return this.runSearch({
      requirement: this.requireRequirement(requirement),
      filters: normalizeFilters(filters),
      rubric: normalizeRubric(rubric),
      changes: ["Re-ran the search using your edited filters and rubric."],
    });
  }

  async refine({
    requirement,
    filters,
    rubric,
    feedback,
    shownProfiles,
    decisions,
  }: RefineInput): Promise<SearchState> {
    const cleanRequirement = this.requireRequirement(requirement);
    const cleanFeedback = cleanText(feedback);
    const decisionList = normalizeDecisions(decisions);

    if (!cleanFeedback && decisionList.length === 0) {
      throw new AppError(400, "Add feedback or mark profiles before refining.");
    }

    const refined = await this.llmProvider.completeJson<RefineSearchResponse>({
      system: this.prompts["refine-search"],
      payload: {
        requirement: cleanRequirement,
        current: {
          filters: normalizeFilters(filters),
          rubric: normalizeRubric(rubric),
        },
        feedback: cleanFeedback,
        decisions: decisionList,
        shownProfiles: normalizeShownProfiles(shownProfiles).map(compactProfile),
      },
    });

    return this.runSearch({
      requirement: cleanRequirement,
      filters: normalizeFilters(refined.filters),
      rubric: normalizeRubric(refined.rubric),
      changes: normalizeStringArray(refined.changes).slice(0, 5),
    });
  }

  freeze({ requirement, filters, rubric, rankedProfiles }: FreezeInput) {
    return {
      frozenAt: new Date().toISOString(),
      requirement: cleanText(requirement),
      filters: normalizeFilters(filters),
      rubric: normalizeRubric(rubric),
      rankedProfiles: Array.isArray(rankedProfiles) ? rankedProfiles : [],
    };
  }

  async generateSearch(requirement: string) {
    const result = await this.llmProvider.completeJson<GenerateSearchResponse>({
      system: this.prompts["generate-search"],
      payload: {
        requirement,
        availableFields: {
          companyTypes: allowedCompanyTypes,
          locations: unique(this.profiles.map((profile) => profile.location)),
          skills: unique(this.profiles.flatMap((profile) => profile.skills)),
        },
      },
    });

    return {
      filters: normalizeFilters(result.filters),
      rubric: normalizeRubric(result.rubric),
      summary: cleanText(result.summary) || "Generated initial filters and rubric from the requirement.",
    };
  }

  async runSearch({ requirement, filters, rubric, changes }: RunSearchInput): Promise<SearchState> {
    const normalizedFilters = normalizeFilters(filters);
    const normalizedRubric = normalizeRubric(rubric);
    const filteredProfiles = applyFilters(this.profiles, normalizedFilters);

    if (filteredProfiles.length === 0) {
      return {
        requirement,
        filters: normalizedFilters,
        rubric: normalizedRubric,
        changes,
        totalMatches: 0,
        rankedProfiles: [],
        visibleProfiles: [],
      };
    }

    const rankedProfiles = await this.scoreProfiles({
      requirement,
      filters: normalizedFilters,
      rubric: normalizedRubric,
      candidates: filteredProfiles,
    });

    return {
      requirement,
      filters: normalizedFilters,
      rubric: normalizedRubric,
      changes,
      totalMatches: filteredProfiles.length,
      rankedProfiles,
      visibleProfiles: rankedProfiles.slice(0, 5),
    };
  }

  async scoreProfiles({
    requirement,
    filters,
    rubric,
    candidates,
  }: {
    requirement: string;
    filters: Filters;
    rubric: RubricItem[];
    candidates: Profile[];
  }): Promise<ScoredProfile[]> {
    const scored: ScoredProfile[] = [];

    for (const batch of chunk(candidates, 12)) {
      const result = await this.llmProvider.completeJson<ScoreProfilesResponse>({
        system: this.prompts["score-profiles"],
        payload: {
          requirement,
          filters,
          rubric,
          profiles: batch.map(compactProfile),
        },
      });

      scored.push(...scoreWithFallback({ batch, scores: result.scores, filters, rubric }));
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  requireRequirement(requirement: unknown): string {
    const cleaned = cleanText(requirement);
    if (!cleaned) {
      throw new AppError(400, "Describe the role before starting the search.");
    }
    return cleaned;
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeDecisions(value: unknown): CandidateDecision[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): CandidateDecision | null => {
      if (!isRecord(item)) return null;
      const id = cleanText(item.id);
      const decision = item.decision;
      if (!id || (decision !== "match" && decision !== "miss")) return null;
      return { id, decision };
    })
    .filter((item): item is CandidateDecision => Boolean(item));
}

function normalizeShownProfiles(value: unknown): ScoredProfile[] {
  return Array.isArray(value) ? (value as ScoredProfile[]) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
