# GitHub Models (Hora)

This document describes the GitHub-related database models used in the Hora platform.

## GithubRepository
- repoId (String, unique): The GitHub repository ID (stored as string for safety)
- fullName: `owner/name`
- name: repo `name`
- owner: object with id, login, type
- htmlUrl, cloneUrl, sshUrl, description
- defaultBranch, private, fork, language, topics, size
- partnerId (String) -> `Partner` (multi-tenant mapping)
- projectId (String) -> `Projects` (link to ProjectModel)
- connectedBy (ObjectId -> `User`) user who connected repo
- installationId / appId: GitHub app installation metadata
- webhook: { id, url, events, active }
- branches: array with { name, lastCommitSha, lastCommitDate }
- lastSyncedAt, metadata

Indexes: repoId unique, partnerId + projectId

## GithubInstallation
- installationId: GitHub App installationId
- appId: GH App id
- account: {id, login, type}
- partnerId: link to `Partner`
- connectedBy: user ObjectId
- permissions, accessTokenRef (prefer to use secrets manager), config
- lastRefreshedAt

## Integration Guidelines
- Avoid storing raw GitHub tokens in DB. Use a secure secret manager for access tokens.
- For each partner/project, map the `partnerId` and `projectId` on a GithubRepository record.
- For GitHub App installations, store installationId and related metadata in `GithubInstallation`.
## API Endpoints (examples)
- GET /api/gihub-repo/repos?partnerId=<id>&projectId=<id>
- GET /api/gihub-repo/repos/:owner/:repo/branches/analytics (live compute)
- GET /api/gihub-repo/repos/:owner/:repo/branches/analytics/cache (DB cached results)
- GET /api/gihub-repo/repos/analytics/project/:projectId (live compute for all project repos)
- GET /api/gihub-repo/repos/analytics/project/:projectId/cache (fetch cached results)

Notes: The `collectRepoBranchAnalytics` function uses GitHub API and may be rate limited. Use the cached route for production analytics queries and schedule periodic sync jobs for up-to-date metrics.

### Sample usage (pseudo)
```js
// list and persist repos
const { data } = await octokit.repos.listForAuthenticatedUser();
await Promise.all(
	data.map(r => upsertRepo(r, partnerId, projectId, connectedBy))
)

// upsert installation
await upsertInstallation(installation, partnerId, connectedBy);
```

## Expected Controllers/Services
- `upsertRepo(repo, partnerId, projectId, connectedBy)` — upsert repo entry
- `upsertInstallation(installation, partnerId, connectedBy)` — upsert installation info
- Syncing: On webhook events, use `repoId` and `installationId` to find and update records.

