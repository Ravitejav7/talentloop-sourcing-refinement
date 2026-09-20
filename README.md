# TalentLoop

AI-powered sourcing refinement loop for the Flexiple engineering assignment.

TalentLoop turns a recruiter's free-text hiring requirement into structured filters, a subjective fit rubric, ranked candidate profiles, and an iterative refinement loop driven by recruiter feedback.

## Assignment Coverage

This repository implements the requested single-session sourcing loop end to end:

- Free-text role requirement to structured filters and rubric.
- Real server-side LLM calls, never mocked or canned.
- Local filtering against the supplied `profiles.json` dataset.
- LLM scoring and ranking for filtered profiles.
- Field-backed explanations for why each profile matched.
- Recruiter refinement through chat feedback and per-profile match/miss controls.
- Re-running the search after refinement with visible changes.
- Freeze state showing final filters, rubric, and ranked shortlist.
- Designed loading, empty, error, and frozen states.
- Prompts committed in the repository.
- API keys loaded from environment variables and never exposed to the browser.

## Demo Flow

Use this sample query for the walkthrough:

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

- TypeScript
- React 19
- Vite
- Express
- Gemini API by default
- Optional OpenAI provider behind the same interface
- Local JSON dataset

## Quick Start

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Add a Gemini API key:

```bash
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-3.6-flash
PORT=3001
```

Run the app:

```bash
npm run dev
```

Open:

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
src/
  main.tsx                 Recruiter-facing React app
  styles.css               UI styling and responsive states

server/
  index.ts                 Server entrypoint
  server.ts                Express app composition
  config/env.ts            Environment and path configuration
  routes/                  API route definitions
  controllers/             HTTP request/response layer
  services/                Sourcing workflow orchestration
  providers/               Gemini/OpenAI provider adapters
  repositories/            Profile and prompt loading
  lib/                     Filtering, scoring, schema helpers
  types/                   Shared backend domain types
  utils/                   Error, JSON, and text utilities

prompts/
  generate-search.md       Free text to filters/rubric
  score-profiles.md        Profile scoring prompt
  refine-search.md         Feedback-driven refinement prompt

data/
  profiles.json            Supplied 48-profile talent dataset

docs/
  ARCHITECTURE.md          Design notes and tradeoffs
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
npm run typecheck
npm run build
```

Real Gemini verification completed:

- `/api/health` confirmed 48 profiles and configured Gemini provider.
- `/api/search` returned filters, rubric, 4 objective matches, ranked candidates, and field-backed explanations.
- `/api/refine` updated filters from `AWS RDS` to `AWS RDS + PostgreSQL`, changed `maxYears` from `7` to `6`, explained why, and re-ranked candidates.
- `/api/freeze` returned a frozen final state.

## Source Control Notes

This project has its own `.git` repository. Generated and local-only files are ignored:

- `.env`
- `node_modules/`
- `dist/`
- `dist-server/`
- `.venv/`

If VS Code shows thousands of unrelated files, open this folder directly:

```text
/Users/balakrishnasai/Documents/Flexiple_project
```

Do not open `/Users/balakrishnasai` as the workspace root.

## Loom Walkthrough Checklist

Show the following in under 15 minutes:

1. Start with the free-text RDS/startup/Bangalore query.
2. Show generated filters and rubric.
3. Show ranked profiles with field-backed explanations.
4. Give feedback such as preferring PostgreSQL-heavy profiles and lowering seniority.
5. Show what changed in filters/rubric and the updated ranking.
6. Show one handled failure or recovery moment, such as a temporary LLM error or missing API key.
7. Freeze the final search.

## Submission Checklist

Before submitting:

```bash
npm install
npm run typecheck
npm run build
git status
```

Then commit and push:

```bash
git add .
git commit -m "Build TalentLoop sourcing refinement loop"
git remote add origin <your-github-repo-url>
git push -u origin main
```

Do not commit `.env`.
