# Verification Guide

This document captures the checks used before submission and gives reviewers a short path to validate the core loop.

## Automated Checks

Run:

```bash
npm install
npm run verify
```

`npm run verify` runs:

```bash
npm run typecheck
npm run build
```

This validates:

- TypeScript correctness across the React app and Express server.
- Frontend production build through Vite.
- Server compilation to `dist-server`.

## Runtime Health Check

Create `.env` from `.env.example`, add an LLM key, then start the app:

```bash
npm run dev
```

In another terminal:

```bash
curl http://localhost:3001/api/health
```

Expected shape:

```json
{
  "ok": true,
  "profileCount": 48,
  "llmProvider": "gemini",
  "llmConfigured": true
}
```

## Production Health Check

Live Render deployment:

```text
https://talentloop-sourcing-refinement.onrender.com
```

Verified health endpoint:

```bash
curl https://talentloop-sourcing-refinement.onrender.com/api/health
```

Observed response:

```json
{
  "ok": true,
  "profileCount": 48,
  "llmProvider": "gemini",
  "llmConfigured": true
}
```

## Production UI Check

Open:

```text
https://talentloop-sourcing-refinement.onrender.com
```

Run the demo search:

```text
RDS developers with 4-7 years of experience who have worked at startups, for a role based in Bangalore.
```

Observed:

- Search returned 6 objective matches.
- Ranked profiles rendered with scores and field-backed explanations.
- Filters and rubric stayed visible on the left.
- Match/Miss and Freeze controls were available.

## Happy Path Scenario

Search query:

```text
RDS developers with 4-7 years of experience who have worked at startups, for a role based in Bangalore.
```

Expected:

- Filters include Bangalore, startup background, AWS RDS, and a 4-7 year range.
- Top profiles show specific evidence from profile fields.
- Candidate cards explain scores using skills, experience, location, and company type.

## Refinement Scenario

Feedback:

```text
Ananya and Sneha are good. Rohan is too senior for this search. Prefer PostgreSQL-heavy RDS candidates over MySQL-heavy profiles.
```

Expected:

- Filters/rubric update visibly.
- PostgreSQL becomes more important.
- Seniority tightens.
- Ranking changes with a plain-English explanation of what changed.

## Failure/Recovery Scenario

Temporarily remove or rename `GEMINI_API_KEY` in `.env`, restart the server, and run a search.

Expected:

- The app shows a readable missing-key error.
- The frontend does not crash.
- Restoring the key and restarting recovers normal behavior.
