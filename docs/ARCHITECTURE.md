# Architecture

This project is intentionally small, but it is structured like a service that can grow without turning into a single-file prototype.

## Request Flow

1. `routes/search.routes.ts` maps API endpoints to controller methods.
2. `controllers/search.controller.ts` handles HTTP concerns and error responses.
3. `services/search.service.ts` owns the sourcing workflow:
   - generate filters and rubric from free text
   - apply deterministic local filters
   - score filtered candidates through the LLM
   - refine filters/rubric from recruiter feedback
   - freeze the final state
4. `providers/*` isolates LLM vendors. Gemini is the default, OpenAI is supported behind the same interface.
5. `lib/*` contains pure domain helpers for filtering, schema normalization, profile compaction, and scoring fallback.
6. `repositories/*` loads local assignment data and prompt files.

## LLM Boundary

The LLM is only called from the server. The browser never sees API keys.

Model output is treated as untrusted:

- prompts ask for strict JSON
- provider parses JSON
- service normalizes filters/rubric before applying them
- missing scores fall back to deterministic profile-backed explanations
- errors are returned as readable UI states

## State

The app intentionally keeps state in memory on the client for one search session. That matches the assignment scope and avoids unnecessary persistence, login, or database setup.

## Main Tradeoffs

- Deterministic filtering is simple and visible, so recruiters can understand why the candidate pool changed.
- LLM scoring is batched to avoid sending all candidates in one large prompt.
- The UI keeps current filters/rubric visible because refinement trust depends on showing what changed.
- No auth, database, multi-role support, or long-term history were added because those are outside the requested single-session loop.
