export type CompanyType = "startup" | "scaleup" | "enterprise" | "agency";

export type PastCompany = {
  company: string;
  company_type: CompanyType;
  title: string;
  years: number;
};

export type Profile = {
  id: string;
  name: string;
  current_title: string;
  years_experience: number;
  location: string;
  current_company: string;
  current_company_type: CompanyType;
  skills: string[];
  past_companies: PastCompany[];
  education: string;
  summary: string;
};

export type Filters = {
  skills: string[];
  minYears: number | null;
  maxYears: number | null;
  locations: string[];
  companyTypes: CompanyType[];
  titles: string[];
};

export type RubricItem = {
  name: string;
  weight: number;
  description: string;
};

export type ScoredProfile = Profile & {
  score: number;
  explanation: string;
  evidence: string[];
};

export type CandidateDecision = {
  id: string;
  decision: "match" | "miss";
};

export type SearchState = {
  requirement: string;
  filters: Filters;
  rubric: RubricItem[];
  changes: string[];
  totalMatches: number;
  rankedProfiles: ScoredProfile[];
  visibleProfiles: ScoredProfile[];
};

export type LlmProvider = {
  isConfigured(): boolean;
  completeJson<T>(request: LlmRequest): Promise<T>;
};

export type LlmRequest = {
  system: string;
  payload: unknown;
};
