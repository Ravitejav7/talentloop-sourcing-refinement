# TalentLoop

AI-powered sourcing refinement loop for the Flexiple engineering assignment.

TalentLoop turns a recruiter's free-text hiring requirement into **structured filters**, a **subjective fit rubric**, **ranked candidate profiles**, and an **iterative refinement loop** driven by recruiter feedback. The product is built as a working recruiter console: clear filters, transparent scoring, evidence-backed explanations, refinement controls, and a frozen final shortlist.

Live demo:

```text
https://talentloop-sourcing-refinement.onrender.com
```

| Area | Implementation |
| --- | --- |
| LLM calls | Real server-side Gemini calls by default, with an OpenAI-compatible provider interface |
| Search flow | Requirement extraction, local objective filtering, LLM scoring, refinement, rerun, freeze |
| Trust signals | Visible filters, visible rubric, field-backed explanations, changed-state summaries |
| Reliability | API-key checks, timeout handling, malformed JSON handling, provider-error UI |
| Review assets | Prompt files, architecture notes, verification notes, runnable repository |

## Reviewer Quick Path

```bash
npm install
cp .env.example .env
npm run dev
```

Add a Gemini key in `.env`, then open:

```text
http://localhost:5173
```

Use this query:

```text
RDS developers with 4-7 years of experience who have worked at startups, for a role based in Bangalore.
```

## Assignment Coverage

This repository implements the requested single-session sourcing loop end to end:

- Free-text role requirement to structured filters and rubric.
- **Real server-side LLM calls**, never mocked or canned.
- Local filtering against the supplied `profiles.json` dataset.
- LLM scoring and ranking for filtered profiles.
- **Field-backed explanations** for why each profile matched.
- Recruiter refinement through chat feedback and per-profile match/miss controls.
- Re-running the search after refinement with visible changes.
- Freeze state showing final filters, rubric, and ranked shortlist.
- Designed loading, empty, error, and frozen states.
- Prompts committed in the repository.
- API keys loaded from environment variables and never exposed to the browser.

## Evaluation Fit

| Flexiple criterion | Where it is addressed |
| --- | --- |
| End-to-end loop with real LLM calls | `/api/search`, `/api/refine`, `/api/freeze`, Gemini provider |
| LLM interaction structure | Dedicated prompt files, provider interface, strict JSON parsing and normalization |
| State across refinement rounds | Current requirement, filters, rubric, ranked profiles, and recruiter feedback are carried through each refinement |
| Failure handling | Missing key, timeout, malformed JSON, provider demand/rate errors, empty matches |
| User clarity and trust | Visible filters/rubric, profile evidence, score reasons, changed-state explanations |
| Recruiter feedback response | Chat feedback plus per-profile match/miss decisions update the next search round |

## Demo Flow

Start with:

```text
RDS developers with 4-7 years of experience who have worked at startups, for a role based in Bangalore.
```

Recommended refinement feedback:

```text
Ananya and Sneha are good. Rohan is too senior for this search. Prefer PostgreSQL-heavy RDS candidates over MySQL-heavy profiles.
```

Expected behavior:

- The app generates filters such as `AWS RDS`, `4-7 years`, `Bangalore`, and `startup`.
- The app ranks matching profiles and explains scores using real fields like skills, years of experience, company type, and location.
- The refinement tightens the search, prefers PostgreSQL-heavy profiles, lowers the seniority ceiling, and explains the changes.
- The freeze action shows the final search state.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, Vite, TypeScript |
| Backend | Express, TypeScript |
| LLM | Gemini by default, optional OpenAI provider |
| Data | Local `profiles.json` dataset |
| Validation | TypeScript check plus production build via `npm run verify` |

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Add a Gemini API key:

```bash
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-3.6-flash
PORT=3001
```

4. Run the app:

```bash
npm run dev
```

5. Open:

```text
http://localhost:5173
```

API health check:

```bash
curl http://localhost:3001/api/health
```

Expected health response:

```json
{
  "ok": true,
  "profileCount": 48,
  "llmProvider": "gemini",
  "llmConfigured": true
}
```

## Deploy on Render

This repository includes `render.yaml`, so Render can create a Node web service directly from the GitHub repo.

Render settings:

| Setting | Value |
| --- | --- |
| Service type | Web Service |
| Runtime | Node |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Region | Singapore |

Environment variables:

| Key | Value |
| --- | --- |
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `LLM_PROVIDER` | `gemini` |
| `GEMINI_MODEL` | `gemini-3.6-flash` |
| `GEMINI_API_KEY` | Add in Render dashboard, never commit it |

Live Render deployment:

```text
https://talentloop-sourcing-refinement.onrender.com
```

Health check:

```text
https://talentloop-sourcing-refinement.onrender.com/api/health
```

## Available Scripts

```bash
npm run dev
```

Runs the Vite frontend and Express API together.

```bash
npm run typecheck
```

Runs TypeScript validation without emitting files.

```bash
npm run build
```

Builds the frontend and compiles the server.

```bash
npm start
```

Runs the compiled production server after `npm run build`.

## Project Structure

```text
.
|-- src/
|   |-- main.tsx              Recruiter console, stateful sourcing loop UI
|   |-- styles.css            Responsive layout, loading, error, empty, frozen states
|   `-- vite-env.d.ts         Vite TypeScript declarations
|
|-- server/
|   |-- index.ts              API entrypoint and process bootstrap
|   |-- server.ts             Express app composition and middleware
|   |-- config/
|   |   `-- env.ts            Environment parsing, defaults, path config
|   |-- routes/
|   |   `-- search.routes.ts  HTTP route definitions
|   |-- controllers/
|   |   `-- search.controller.ts  HTTP request/response layer
|   |-- services/
|   |   `-- search.service.ts  Sourcing workflow orchestration
|   |-- providers/
|   |   |-- llm.provider.ts   Provider contract shared by all LLM adapters
|   |   |-- gemini.provider.ts
|   |   `-- openai.provider.ts
|   |-- repositories/
|   |   |-- profile.repository.ts
|   |   `-- prompt.repository.ts
|   |-- lib/
|   |   |-- filter-engine.ts  Objective profile filtering
|   |   |-- scoring.ts        Deterministic fallback scoring/explanations
|   |   |-- schema.ts         Filter/rubric normalization
|   |   `-- profile-presenter.ts
|   |-- types/
|   |   `-- domain.ts         Shared backend domain types
|   `-- utils/
|       |-- app-error.ts      Typed operational errors
|       |-- json.ts           LLM JSON extraction/parsing helpers
|       `-- text.ts           Text normalization helpers
|
|-- prompts/
|   |-- generate-search.md    Free-text requirement to filters/rubric
|   |-- score-profiles.md     Candidate scoring prompt
|   `-- refine-search.md      Feedback-driven refinement prompt
|
|-- data/
|   `-- profiles.json         Supplied 48-profile talent dataset
|
`-- docs/
    |-- ARCHITECTURE.md       Design notes and tradeoffs
    `-- VERIFICATION.md       Manual and automated verification notes
```

## API Endpoints

### `GET /api/health`

Returns profile count and whether the LLM provider is configured.

### `POST /api/search`

Starts a search from free text.

Request:

```json
{
  "requirement": "RDS developers with 4-7 years of experience who have worked at startups, for a role based in Bangalore."
}
```

Response includes:

- normalized filters
- generated rubric
- total objective matches
- ranked profiles
- first visible profiles
- explanation of the generated search intent

### `POST /api/rerun`

Runs the search again after the recruiter edits filters or rubric directly.

### `POST /api/refine`

Uses recruiter feedback to adjust filters and rubric, then re-runs the search.

Request includes:

- current requirement
- current filters
- current rubric
- chat feedback
- optional per-profile match/miss decisions

### `POST /api/freeze`

Returns the final frozen search state.

## LLM Design

The LLM is called only from the server. The frontend never receives or uses API keys.

Model output is treated as untrusted:

- prompts request strict JSON
- provider parses JSON
- service normalizes filters and rubric before use
- malformed JSON returns a readable error
- missing scores fall back to deterministic, profile-backed explanations
- timeouts and provider errors are surfaced in the UI

The current provider interface supports:

- Gemini: `server/providers/gemini.provider.ts`
- OpenAI: `server/providers/openai.provider.ts`

Gemini is the default because it has an accessible free-tier path for this assignment.

## Prompt Files

The prompts are part of the submission and live in:

- `prompts/generate-search.md`
- `prompts/score-profiles.md`
- `prompts/refine-search.md`

They are intentionally explicit about:

- output JSON shape
- using objective filters only for visible profile fields
- keeping subjective fit in the rubric
- citing real candidate fields in explanations
- making conservative refinement changes

## UX Notes

The UI is built as a working recruiter console rather than a landing page.

Key states are designed:

- First-load empty state
- Search thinking state
- Editable filters and rubric
- Ranked candidate cards
- Evidence-backed explanations
- Per-profile match/miss decisions
- Chat-based refinement
- Empty results
- LLM/provider errors
- Frozen final summary

The current filters and rubric remain visible during the loop because recruiter trust depends on seeing exactly what changed.

## Error Handling

Handled cases include:

- Missing API key
- Invalid or unavailable model
- LLM rate limit or high-demand response
- Slow LLM response timeout
- Malformed JSON from the model
- No profiles matching objective filters
- Missing refinement feedback

During verification, Gemini returned a temporary high-demand error and the app surfaced it as a readable failure state instead of crashing.

## Decisions and Tradeoffs

Prioritized:

- Complete end-to-end loop
- Real LLM calls
- Strong TypeScript boundaries
- Clean backend layering
- Reviewer-readable prompts
- Recruiter-friendly refinement UX
- Explicit error states

Cut intentionally:

- Login
- Persistence across sessions
- Multiple roles/search sessions
- Database storage
- Background jobs
- Large-scale search infrastructure

These were cut because the assignment explicitly asks for one focused search session and values prioritization over feature breadth.

## Validation Performed

The following checks were run successfully:

```bash
npm run verify
```

`npm run verify` runs TypeScript checking and the full production build. A fuller verification checklist is available in `docs/VERIFICATION.md`.

Real Gemini verification completed:

- `/api/health` confirmed 48 profiles and configured Gemini provider.
- `/api/search` returned filters, rubric, 6 objective matches, ranked candidates, and field-backed explanations for the demo query.
- `/api/refine` updated filters from `AWS RDS` to `AWS RDS + PostgreSQL`, changed `maxYears` from `7` to `6`, explained why, and re-ranked candidates.
- `/api/freeze` returned a frozen final state.
- Render deployment verified at `https://talentloop-sourcing-refinement.onrender.com/api/health` with `200 OK`, 48 profiles, and configured Gemini provider.
- Live Render UI verified at `https://talentloop-sourcing-refinement.onrender.com` with the demo query returning 6 objective matches.

## Reviewer Walkthrough

For a quick review, run the app and use the demo query from the top of this README.

Suggested review path:

1. Start a search with the free-text RDS/startup/Bangalore query.
2. Show generated filters and rubric.
3. Show ranked profiles with field-backed explanations.
4. Add refinement feedback that prefers PostgreSQL-heavy profiles and lowers seniority.
5. Compare the changed filters, changed rubric, and updated ranking.
6. Freeze the search to inspect the final recruiter-ready shortlist.

The UI also includes readable empty, loading, frozen, and provider-error states so the loop stays understandable when the model is slow, temporarily unavailable, or returns invalid output.
