import React, { type FormEvent, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  CircleAlert,
  Loader2,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import "./styles.css";

type CompanyType = "startup" | "scaleup" | "enterprise" | "agency";
type Decision = "match" | "miss";
type LoadingState = "" | "Thinking" | "Re-running" | "Refining" | "Freezing";

type Filters = {
  skills: string[];
  minYears: number | null;
  maxYears: number | null;
  locations: string[];
  companyTypes: CompanyType[];
  titles: string[];
};

type RubricItem = {
  name: string;
  weight: number;
  description: string;
};

type ScoredProfile = {
  id: string;
  name: string;
  current_title: string;
  years_experience: number;
  location: string;
  current_company: string;
  current_company_type: CompanyType;
  skills: string[];
  education: string;
  summary: string;
  score: number;
  explanation: string;
  evidence: string[];
};

type SearchState = {
  requirement: string;
  filters: Filters;
  rubric: RubricItem[];
  changes: string[];
  totalMatches: number;
  rankedProfiles: ScoredProfile[];
  visibleProfiles: ScoredProfile[];
};

type FrozenState = {
  frozenAt: string;
  requirement: string;
  filters: Filters;
  rubric: RubricItem[];
  rankedProfiles: ScoredProfile[];
};

const API_BASE = import.meta.env.VITE_API_BASE || "";
const starterQuery =
  "RDS developers with 4-7 years of experience who have worked at startups, for a role based in Bangalore.";

function App() {
  const [requirement, setRequirement] = useState(starterQuery);
  const [state, setState] = useState<SearchState | null>(null);
  const [frozen, setFrozen] = useState<FrozenState | null>(null);
  const [feedback, setFeedback] = useState("");
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [loading, setLoading] = useState<LoadingState>("");
  const [error, setError] = useState("");

  const hasResults = Boolean(state?.visibleProfiles?.length);
  const decisionList = useMemo(
    () =>
      Object.entries(decisions).map(([id, decision]) => ({
        id,
        decision,
      })),
    [decisions],
  );

  async function startSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFrozen(null);
    setDecisions({});
    await request("/api/search", {
      requirement,
    });
  }

  async function rerunEdited() {
    if (!state) return;
    await request("/api/rerun", {
      requirement: state.requirement,
      filters: state.filters,
      rubric: state.rubric,
    });
  }

  async function refine() {
    if (!state) return;
    await request("/api/refine", {
      requirement: state.requirement,
      filters: state.filters,
      rubric: state.rubric,
      feedback,
      decisions: decisionList,
      shownProfiles: state.visibleProfiles,
    });
    setFeedback("");
    setDecisions({});
  }

  async function freezeSearch() {
    if (!state) return;
    setLoading("Freezing");
    setError("");
    try {
      const data = await api<FrozenState>("/api/freeze", {
        requirement: state.requirement,
        filters: state.filters,
        rubric: state.rubric,
        rankedProfiles: state.rankedProfiles,
      });
      setFrozen(data);
    } catch (apiError: unknown) {
      setError(getErrorMessage(apiError));
    } finally {
      setLoading("");
    }
  }

  async function request(url: string, payload: unknown) {
    setLoading(url.includes("refine") ? "Refining" : url.includes("rerun") ? "Re-running" : "Thinking");
    setError("");
    try {
      const data = await api<SearchState>(url, payload);
      setState(data);
    } catch (apiError: unknown) {
      setError(getErrorMessage(apiError));
    } finally {
      setLoading("");
    }
  }

  function updateFilters(nextFilters: Filters) {
    setState((current) => (current ? { ...current, filters: nextFilters } : current));
  }

  function updateRubric(nextRubric: RubricItem[]) {
    setState((current) => (current ? { ...current, rubric: nextRubric } : current));
  }

  return (
    <main className="app">
      <section className="workspace">
        <div className="topbar">
          <div>
            <p className="eyebrow">Flexiple assignment</p>
            <h1>Sourcing refinement loop</h1>
          </div>
          <div className="status">
            {loading ? (
              <>
                <Loader2 className="spin" size={16} /> {loading}
              </>
            ) : frozen ? (
              <>
                <Lock size={16} /> Frozen
              </>
            ) : (
              "Live session"
            )}
          </div>
        </div>

        <form className="searchbar" onSubmit={startSearch}>
          <Search size={18} />
          <textarea
            value={requirement}
            onChange={(event) => setRequirement(event.target.value)}
            rows={2}
            placeholder="Describe the role, background, skills, location, and experience range"
          />
          <button type="submit" disabled={Boolean(loading)}>
            {loading === "Thinking" ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
            Search
          </button>
        </form>

        {error && (
          <div className="notice error">
            <CircleAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {!state && !loading && (
          <div className="empty-state">
            <SlidersHorizontal size={26} />
            <h2>Start with one natural-language search.</h2>
            <p>The app will generate editable filters and a rubric, then rank the local profile dataset.</p>
          </div>
        )}

        {state && (
          <div className="grid">
            <aside className="panel controls">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Always visible</p>
                  <h2>Filters & rubric</h2>
                </div>
                <button className="icon-button" type="button" onClick={rerunEdited} disabled={Boolean(loading)}>
                  <RefreshCw size={17} />
                  <span>Run</span>
                </button>
              </div>

              <FilterEditor filters={state.filters} onChange={updateFilters} />
              <RubricEditor rubric={state.rubric} onChange={updateRubric} />

              <div className="change-log">
                <p className="label">Latest changes</p>
                {(state.changes?.length ? state.changes : ["Search is ready."]).map((change) => (
                  <p key={change}>{change}</p>
                ))}
              </div>
            </aside>

            <section className="results">
              <div className="results-head">
                <div>
                  <p className="eyebrow">{state.totalMatches} objective matches</p>
                  <h2>Top profiles</h2>
                </div>
                <button className="freeze" type="button" onClick={freezeSearch} disabled={!state.rankedProfiles?.length || Boolean(loading)}>
                  <Lock size={17} />
                  Freeze
                </button>
              </div>

              {loading && (
                <div className="thinking">
                  <Loader2 className="spin" size={22} />
                  Updating the shortlist with the current search logic.
                </div>
              )}

              {!loading && !hasResults && (
                <div className="empty-state compact">
                  <CircleAlert size={22} />
                  <h2>No profiles passed the filters.</h2>
                  <p>Relax a skill, location, company type, or experience constraint and run again.</p>
                </div>
              )}

              <div className="cards">
                {state.visibleProfiles?.map((profile, index) => (
                  <ProfileCard
                    key={profile.id}
                    index={index}
                    profile={profile}
                    decision={decisions[profile.id]}
                    onDecision={(decision) =>
                      setDecisions((current) => {
                        const next = { ...current };
                        if (next[profile.id] === decision) {
                          delete next[profile.id];
                        } else {
                          next[profile.id] = decision;
                        }
                        return next;
                      })
                    }
                  />
                ))}
              </div>

              <div className="feedback">
                <div className="feedback-title">
                  <MessageSquare size={18} />
                  Refine with recruiter feedback
                </div>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Example: 1 is too junior, 2 and 4 are right, prefer backend-heavy startup people."
                />
                <button type="button" onClick={refine} disabled={Boolean(loading) || (!feedback.trim() && decisionList.length === 0)}>
                  {loading === "Refining" ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
                  Refine
                </button>
              </div>
            </section>
          </div>
        )}

        {frozen && <FrozenSummary frozen={frozen} />}
      </section>
    </main>
  );
}

function FilterEditor({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const setList = (key: keyof Pick<Filters, "skills" | "locations" | "companyTypes" | "titles">, value: string) =>
    onChange({
      ...filters,
      [key]: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });

  return (
    <div className="editor">
      <label>
        Skills
        <input value={filters.skills.join(", ")} onChange={(event) => setList("skills", event.target.value)} />
      </label>
      <div className="split">
        <label>
          Min years
          <input
            type="number"
            value={filters.minYears ?? ""}
            onChange={(event) => onChange({ ...filters, minYears: event.target.value ? Number(event.target.value) : null })}
          />
        </label>
        <label>
          Max years
          <input
            type="number"
            value={filters.maxYears ?? ""}
            onChange={(event) => onChange({ ...filters, maxYears: event.target.value ? Number(event.target.value) : null })}
          />
        </label>
      </div>
      <label>
        Locations
        <input value={filters.locations.join(", ")} onChange={(event) => setList("locations", event.target.value)} />
      </label>
      <label>
        Company types
        <input value={filters.companyTypes.join(", ")} onChange={(event) => setList("companyTypes", event.target.value)} />
      </label>
      <label>
        Title keywords
        <input value={filters.titles.join(", ")} onChange={(event) => setList("titles", event.target.value)} />
      </label>
    </div>
  );
}

function RubricEditor({
  rubric,
  onChange,
}: {
  rubric: RubricItem[];
  onChange: (rubric: RubricItem[]) => void;
}) {
  const update = (index: number, patch: Partial<RubricItem>) => {
    onChange(rubric.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="rubric">
      <p className="label">Fit rubric</p>
      {rubric.map((item, index) => (
        <div className="rubric-item" key={`${item.name}-${index}`}>
          <input value={item.name} onChange={(event) => update(index, { name: event.target.value })} />
          <div className="rubric-line">
            <input
              type="range"
              min="1"
              max="5"
              value={item.weight}
              onChange={(event) => update(index, { weight: Number(event.target.value) })}
            />
            <span>{item.weight}</span>
          </div>
          <textarea rows={2} value={item.description} onChange={(event) => update(index, { description: event.target.value })} />
        </div>
      ))}
    </div>
  );
}

function ProfileCard({
  profile,
  index,
  decision,
  onDecision,
}: {
  profile: ScoredProfile;
  index: number;
  decision?: Decision;
  onDecision: (decision: Decision) => void;
}) {
  return (
    <article className="profile-card">
      <div className="profile-top">
        <div className="rank">{index + 1}</div>
        <div>
          <h3>{profile.name}</h3>
          <p>
            {profile.current_title} · {profile.years_experience} yrs · {profile.location}
          </p>
        </div>
        <div className="score">{profile.score}</div>
      </div>
      <p className="explanation">{profile.explanation}</p>
      <div className="chips">
        {profile.skills.slice(0, 5).map((skill) => (
          <span key={skill}>{skill}</span>
        ))}
      </div>
      <div className="evidence">
        {profile.evidence?.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
      <div className="decision-row">
        <button className={decision === "match" ? "selected yes" : ""} type="button" onClick={() => onDecision("match")}>
          <Check size={16} /> Match
        </button>
        <button className={decision === "miss" ? "selected no" : ""} type="button" onClick={() => onDecision("miss")}>
          <X size={16} /> Miss
        </button>
      </div>
    </article>
  );
}

function FrozenSummary({ frozen }: { frozen: FrozenState }) {
  return (
    <section className="frozen">
      <div>
        <p className="eyebrow">Frozen search</p>
        <h2>Final shortlist</h2>
      </div>
      <div className="frozen-grid">
        <div>
          <p className="label">Filters</p>
          <pre>{JSON.stringify(frozen.filters, null, 2)}</pre>
        </div>
        <div>
          <p className="label">Top ranked profiles</p>
          {frozen.rankedProfiles.slice(0, 8).map((profile, index) => (
            <p className="final-row" key={profile.id}>
              <strong>{index + 1}. {profile.name}</strong>
              <span>{profile.score} · {profile.current_title}</span>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

async function api<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(readErrorMessage(data));
  return data as T;
}

function readErrorMessage(data: unknown): string {
  if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") {
    return data.error;
  }
  return "Request failed.";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found.");
}

createRoot(root).render(<App />);
