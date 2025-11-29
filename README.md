# Backend_SD - README

## Overview

This README explains how the backend is structured, how to configure environment variables, how to run the server locally, how to call the AI velocity API endpoint and the helper script to calculate Developer Velocity (DORA metrics). It also includes common troubleshooting steps.

The backend uses:
- Node 20+ (recommended) with ES modules
- Express
- Mongoose (MongoDB)
- Octokit (`@octokit/rest`) to query GitHub
- Google GenAI (`@google/genai`) for AI report generation (optional)
- nodemailer + Handlebars templates for invitations

This document assumes you are working in the repository root `Backend_SD`.

---

## Quick Setup

1) Install dependencies

```bash
cd Backend_SD
npm install
```

2) Create or validate `.env` file at `Backend_SD/.env`

Minimal required env vars for most features:

```dotenv
MONGODB_URI="<your_mongodb_uri>"
PORT=8000
JWT_SECRET="..."
INVITE_JWT_TOKEN="..."
EMAIL_USER="..."
EMAIL_PASSWORD="..."
FRONTEND_URL='http://localhost:5173'

# GitHub PAT
GITHUB_TOKEN=github_pat_xxx

# Optional Gemini API key (for AI reports)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash
```

Important notes:
- If your GitHub token is a PAT (personal access token), for private repositories you likely need the repo scope; to read actions/workflows add `workflow` scope if you plan to query workflow runs or show actions-related metrics.
- If you use `GEMINI_API_KEY`, ensure Node 20+ is used and that the SDK `@google/genai` is installed.

3) Start the server

```bash
cd Backend_SD
node index.js
# or use nodemon for dev
# nodemon index.js
```

The server runs on `http://localhost:8000` by default.

---

## Main API Endpoints

You can call the following endpoints:

- `GET /server` : Simple health endpoint that returns "Hello World!"
- `GET /api/ai/velocity?owner=<owner>&repo=<repo>&since=YYYY-MM-DD&until=YYYY-MM-DD` : Returns DORA metrics and AI-generated summary for a repo. `since` and `until` are optional (defaults to last 30 days).

Example:

```bash
curl -sS "http://localhost:8000/api/ai/velocity?owner=amitosh2002&repo=Backend_SD" | jq '.'
```

Expected JSON sample returned by the velocity endpoint:

```json
{
  "success": true,
  "metrics": {
    "deploymentFrequency_per_day": 0,
    "deployments_count": 0,
    "avgLeadTimeMs": null,
    "avgLeadTimeHuman": null,
    "changeFailureRatePercent": 0,
    "mttrMs": null,
    "mttrHuman": null,
    "mergedPRCount": 2,
    "avgPRSizeLines": 0,
    "codeChurnPercent": 0
  },
  "samplePRs": [...],
  "sampleIncidents": [...],
  "aiReport": "[AI text here or placeholder if Gemini not configured]"
}
```

---

## Utility Script for Local Metrics (DORA)

There is a helper script `scripts/velocityReport.js` which reproduces the same computations done in the endpoint but is intended for direct testing and debugging.

Usage:

```bash
cd Backend_SD
node scripts/velocityReport.js owner repo [sinceISO] [untilISO]
```

Example:

```bash
node scripts/velocityReport.js amitosh2002 Backend_SD
```

This script reads `GITHUB_TOKEN` from `.env` and runs the queries to the GitHub API using `Octokit` then prints JSON.

---

## GitHub Token / Octokit Access

To call GitHub endpoints the backend uses `@octokit/rest` -> `Octokit` instantiated using `process.env.GITHUB_TOKEN`. Make sure your PAT has these scopes (recommended):
- `repo` (or `public_repo` for public repos) — for repository data.
- `workflow` — to list workflow runs.
- `admin:repo_hook` — if you plan to set up webhooks (optional).

You can quickly verify your token on the server shell:

```bash
export GITHUB_TOKEN=$(grep -E '^GITHUB_TOKEN=' .env | cut -d '=' -f2-)
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | jq '.login, .id'
```

On the server side, if you start the Node process before setting `.env` or if the token/process changes, you must restart the Node server for `dotenv` to re-inject env values.

---

## Gemini (AI) Integration

- The AI integration `@google/genai` is optional and requires `GEMINI_API_KEY` or other Google auth settings for Vertex.
- For server-side usage with `GoogleGenAI`, the code exposes a fallback if the key is not set — the server won't crash. The fallback will return a friendly message instead of throwing. This behavior was intentionally added to make dev/testing easier.
- If you set `GEMINI_API_KEY`, the `GET /api/ai/velocity` endpoint may return an `aiReport` with an AI-generated text summary.

Note:
- Node 20+ is recommended for the GenAI SDK.
- If the SDK throws on import (or your process error is ‘does not provide export named Client’), ensure you follow these imports: `import { GoogleGenAI } from '@google/genai'; const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });`.

---

## Email Invitations

- The invitation email template used by the backend expects the variable `invitationLink` (clearly spelled). Ensure that the data you send to `sendInvitationEmail` sets `invitationLink` key (not `invitaitonLink`).
- The template uses Handlebars and HTML anchor quotes, e.g. `href="{{invitationLink}}"`.
- If links are rewritten by email providers for click-tracking that’s an external provider feature and not a server error — some providers change link hrefs for tracking.

---

## GitHub Analytics (Branch & Repo)

- There are models and services to collect branch analytics (PRs, comments, runs) and store them in DB under `BranchAnalyticsModel`.
- Services: `services/githubServices.js` provides `collectRepoBranchAnalytics(owner, repo, repoModel)` which lists branches and upserts records into DB.
- There's also a cron job (`cronjs/cronjob.js`) that periodically hits backend endpoints for scheduled analytics collection.

Manual run (dev/test):

```bash
cd Backend_SD
node scripts/velocityReport.js amitosh2002 Backend_SD
```

---

## Troubleshooting

- "Bad credentials": Restart your backend after updating `.env` to ensure `GITHUB_TOKEN` is loaded. Alternatively, verify token by running in shell:

```bash
export GITHUB_TOKEN=$(grep -E '^GITHUB_TOKEN=' .env | cut -d '=' -f2-)
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | jq '.login'
```

- Gemini import errors: Confirm Node 20 and `@google/genai` installed. If you see `SyntaxError: requested module '@google/genai' does not provide an export named 'Client'` use `GoogleGenAI` class as the client instead:

```js
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

- If `GEMINI_API_KEY` is not provided, the server will print a warning like `GEMINI_API_KEY not set — Gemini features will be disabled.` and return a placeholder instead of AI results.

- Database warnings (duplicate index): If you get `Duplicate schema index` warnings from Mongoose, inspect `models/*` to ensure you aren’t adding duplicate indices. Duplicate indices are harmless but noisy — consider cleaning up schema index duplication.

- If an endpoint returns 404: confirm backend routes and that `index.js` mounts them (for example `app.use('/api/ai', aiRouter)`). Also check CORS and allowed origins if calling from frontend (Vite) using `VITE_BACKEND_URL`.

---

## Developer tasks & notes

- The backend uses `process.env.GITHUB_TOKEN` to authenticate Octokit. If you plan to implement per-user GitHub OAuth tokens, you’ll need to change Octokit instantiation to use user token from DB and adjust controllers accordingly.
- Cron job: `cronjs/cronjob.js` is configured to hit certain endpoints. For production deployments use dedicated queued jobs and backoff to avoid API rate limiting.
- Add `geminiEnabled` health flag if you want to check whether AI is enabled.
- The `services/geminiService.js` has a fallback to avoid startup crash when `GEMINI_API_KEY` not present.

---

## Summary of Common Commands

```bash
# Install
cd Backend_SD
npm install

# Start server
node index.js

# Run velocity script locally
node scripts/velocityReport.js amitosh2002 Backend_SD

# Call velocity endpoint via curl
curl -sS "http://localhost:8000/api/ai/velocity?owner=amitosh2002&repo=Backend_SD" | jq '.'

# Confirm token
export GITHUB_TOKEN=$(grep -E '^GITHUB_TOKEN=' .env | cut -d '=' -f2-)
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | jq '.login'
```

If you want me to add a quick test harness, CI checks, or a GitHub token scope checker, tell me what you'd like and I can add it next.

---

## License
MIT / Check repo for license file if needed.
