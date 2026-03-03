import { Octokit } from "@octokit/rest";
import Branch from "../../models/Branch.js";
import { octokit, collectRepoBranchAnalytics } from "../../services/githubServices.js";
import { GithubConfigModel } from "../../models/PlatformModel/GithubConfigModel.js";
import { decrypt } from "../../utility/securityUtility.js";

// Ensure we have a fallback Octokit if service import fails
const localOctokit = octokit || new Octokit({ auth: process.env.GITHUB_TOKEN });

const getOctokit = async (projectId) => {
  if (!projectId) return localOctokit;
  const config = await GithubConfigModel.findOne({ projectId });
  if (config && config.githubSecretCode) {
    const decryptedToken = decrypt(config.githubSecretCode);
    if (decryptedToken) {
      return new Octokit({ auth: decryptedToken });
    }
  }
  return localOctokit;
};

// List repos of authenticated user
export const listRepos = async (req, res) => {
  try {
    const { projectId } = req.query;
    const client = await getOctokit(projectId);
    const per_page = Math.min(parseInt(req.query.per_page || 100, 10), 100);
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const { data } = await client.repos.listForAuthenticatedUser({ per_page, page });
    return res.json({ success: true, repos: data, page, per_page });
  } catch (err) {
    console.error('listRepos error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list repos', error: err.message });
  }
};

// Create a new repo
export const createRepo = async (req, res) => {
  try {
    const { name, privateRepo } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Repository name is required' });
    const { data } = await localOctokit.repos.createForAuthenticatedUser({
      name,
      private: privateRepo ?? false,
    });
    res.status(201).json({ success: true, repo: data });
  } catch (err) {
    console.error('createRepo error:', err);
    res.status(500).json({ success: false, message: 'Failed to create repo', error: err.message });
  }
};

// List branches of a repo
export const listBranches = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { projectId } = req.query;
    if (!owner || !repo) return res.status(400).json({ success: false, message: 'owner and repo are required' });
    const client = await getOctokit(projectId);
    const per_page = Math.min(parseInt(req.query.per_page || 100, 10), 100);
    const { data } = await client.repos.listBranches({ owner, repo });
    res.json(data);
  } catch (err) {
    console.error('listBranches error:', err);
    res.status(500).json({ success: false, message: 'Failed to list branches', error: err.message });
  }
};

// Create a branch (by referencing another branch SHA)
export const createBranch = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { newBranchName, fromBranch, projectId } = req.body;
    if (!owner || !repo || !newBranchName || !fromBranch) return res.status(400).json({ success: false, message: 'owner, repo, newBranchName and fromBranch are required' });

    const client = await getOctokit(projectId);

    // 1. Get the reference SHA of the branch to copy
    const { data: refData } = await client.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });

    const sha = refData.object.sha;

    // ─── Fetch the Hora user who triggered this action ──────────────────────
    const { default: User } = await import("../../models/UserModel.js");
    const horaUser = await User.findById(req.user.userId || req.user.id).lean();
    const contributorName = horaUser
      ? (horaUser.profile?.firstName
          ? `${horaUser.profile.firstName} ${horaUser.profile.lastName || ''}`.trim()
          : horaUser.username)
      : 'Unknown';
    const contributorUsername = horaUser?.username || 'unknown';
    const contributorAvatar = horaUser?.profile?.avatar || null;
    // ─────────────────────────────────────────────────────────────────────────

    // Sanitize branch name
    const sanitizedBranch = newBranchName
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_/]/g, '');

    // 2. Create a new ref
    let finalBranchName = sanitizedBranch;
    // Optional prefix logic if they want it
    if (req.body.prefixWithUsername && contributorUsername) {
      const safeUsername = contributorUsername.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      if (!finalBranchName.startsWith(`${safeUsername}/`)) {
        finalBranchName = `${safeUsername}/${finalBranchName}`;
      }
    }

    const { data } = await client.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${finalBranchName}`,
      sha,
    });

    const branchUrl = `https://github.com/${owner}/${repo}/tree/${finalBranchName}`;

    // 3. Store in Ticket if ticketId is provided
    const { ticketId } = req.body;
    if (ticketId) {
      const { TicketModel } = await import("../../models/TicketModels.js");
      await TicketModel.findByIdAndUpdate(ticketId, {
        $push: {
          githubBranches: {
            name: finalBranchName,
            url: branchUrl,
            status: "CREATED",
            createdBy: contributorName // storing contributor for the UI
          }
        }
      });
    }

    res.status(201).json({ 
      success: true, 
      branch: data, 
      branchUrl,
      createdBy: {
        name: contributorName,
        username: contributorUsername,
        avatar: contributorAvatar,
        userId: req.user.userId || req.user.id,
      },
    });
  } catch (err) {
    console.error('createBranch error:', err);
    
    // Better error message for common GitHub permission issues
    if (err.status === 403 && err.message?.includes('Resource not accessible by personal access token')) {
        return res.status(403).json({ 
            success: false, 
            message: 'GitHub Token missing permissions. Please ensure your token has "repo" scope (classic) or "Contents: Write" permission (fine-grained).',
            error: err.message 
        });
    }

    res.status(err.status || 500).json({ 
        success: false, 
        message: err.status === 403 ? 'Permission denied by GitHub. Check your token scopes.' : 'Failed to create branch', 
        error: err.message 
    });
  }
};
// controllers/branchController.js
/**
 * CRUD: create branch record (in DB) - not create git branch
 */
export const createBranchRecord = async (req, res) => {
  try {
    const { owner, repo, branchName, meta } = req.body;
    if (!owner || !repo || !branchName) {
      return res.status(400).json({ success: false, message: 'owner, repo and branchName are required' });
    }
    const createdBy = req.user?.id || req.body.createdBy || null;
    const doc = await Branch.create({ owner, repo, branchName, meta, createdBy });
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const listBranchRecords = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000);
    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);
    const docs = await Branch.find().skip(skip).limit(limit).lean();
    return res.json({ success: true, data: docs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getBranchRecord = async (req, res) => {
  try {
    const doc = await Branch.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, error: "Not found" });
    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateBranchRecord = async (req, res) => {
  try {
    const doc = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ success: false, error: "Not found" });
    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteBranchRecord = async (req, res) => {
  try {
    const doc = await Branch.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: "Not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// -------------------
// GitHub data aggregator
// Returns full details for a branch
// -------------------
export const getBranchDetails = async (req, res) => {
  try {
    const { owner, repo, branch } = req.query;
    if (!owner || !repo || !branch) {
      return res.status(400).json({ success: false, message: "owner, repo and branch are required" });
    }

    // 1) Branch basic info & latest commit
    const branchInfoResp = await localOctokit.rest.repos.getBranch({
      owner,
      repo,
      branch
    });
    const branchInfo = branchInfoResp.data;
    const latestSha = branchInfo?.commit?.sha;

    // 2) Commit details
    const commitResp = await localOctokit.rest.repos.getCommit({
      owner,
      repo,
      ref: latestSha
    });

    // 3) PRs linked to this branch
    // Use the head query: owner:branch
    const prsResp = await localOctokit.rest.pulls.list({
      owner,
      repo,
      state: "all",
      head: `${owner}:${branch}`,
      per_page: 100
    });
    const prs = prsResp.data;

    // 4) For each PR get review status, review comments, issue comments
    const prConcurrency = Math.max(1, Math.min(parseInt(process.env.GITHUB_PR_CONCURRENCY || '5', 10), 20));
    const prDetails = [];
    for (let i = 0; i < prs.length; i += prConcurrency) {
      const chunk = prs.slice(i, i + prConcurrency);
      const chunkResults = await Promise.all(chunk.map(async (pr) => {
        try {
          const [reviewsResp, reviewCommentsResp, issueCommentsResp] = await Promise.all([
            localOctokit.rest.pulls.listReviews({ owner, repo, pull_number: pr.number }),
            localOctokit.rest.pulls.listReviewComments({ owner, repo, pull_number: pr.number }),
            // PR issue comments are under issues API
            localOctokit.rest.issues.listComments({ owner, repo, issue_number: pr.number })
          ]);

          let checkRunsResp;
          try {
            checkRunsResp = await localOctokit.rest.checks.listForRef({ owner, repo, ref: pr.head.sha });
          } catch (e) {
            console.warn('checks.listForRef failed for PR', pr.number, e.message);
            checkRunsResp = { data: { check_runs: [] } };
          }

          let workflowRunsResp;
          try {
            workflowRunsResp = await localOctokit.rest.actions.listWorkflowRunsForRepo({ owner, repo, branch });
          } catch (e) {
            console.warn('actions.listWorkflowRunsForRepo failed for', owner, repo, branch, e.message);
            workflowRunsResp = { data: { workflow_runs: [] } };
          }

          let deploymentsResp;
          try {
            deploymentsResp = await localOctokit.rest.repos.listDeployments({ owner, repo, sha: pr.head.sha });
          } catch (e) {
            console.warn('repos.listDeployments failed for PR', pr.number, e.message);
            deploymentsResp = { data: [] };
          }

          return {
            pr: {
              number: pr.number,
              title: pr.title,
              state: pr.state,
              merged: !!pr.merged_at,
              created_at: pr.created_at,
              merged_at: pr.merged_at,
              user: pr.user,
              head: pr.head,
              base: pr.base,
              additions: pr.additions,
              deletions: pr.deletions,
              changed_files: pr.changed_files,
              url: pr.html_url,
            },
            reviews: reviewsResp.data,
            review_comments: reviewCommentsResp.data,
            issue_comments: issueCommentsResp.data,
            check_runs: checkRunsResp.data.check_runs,
            workflow_runs: (workflowRunsResp.data.workflow_runs || []).filter(w => w.head_sha === pr.head.sha),
            deployments: deploymentsResp.data,
          };
        } catch (error) {
          console.warn('Error while collecting PR details for PR', pr.number, error.message);
          return { pr: { number: pr.number, url: pr.html_url }, error: error.message };
        }
      }));
      prDetails.push(...chunkResults);
      }

    // 8) Workflow runs for the branch (all)
    let workflowRuns = [];
    try {
      const branchWorkflowRunsResp = await localOctokit.rest.actions.listWorkflowRunsForRepo({ owner, repo, branch, per_page: 100 });
      workflowRuns = branchWorkflowRunsResp.data.workflow_runs;
    } catch (e) {
      console.warn('actions.listWorkflowRunsForRepo failed for branch', owner, repo, branch, e.message);
      workflowRuns = [];
    }

    // 9) Find failing runs among workflowRuns
    const failedRuns = workflowRuns.filter(run => run.conclusion === "failure" || run.conclusion === "cancelled");

    // 10) Build final response
    return res.json({
      success: true,
      branch: branchInfo,
      latestCommit: commitResp.data,
      prs: prDetails,
      workflowRuns,
      failedRuns
    });

  } catch (err) {
    console.error("getBranchDetails error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getRepoBranchesAnalytics = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    if (!owner || !repo) return res.status(400).json({ success: false, message: 'owner and repo required' });
    const repoModel = await (await import('../../models/PlatformModel/GithubRepoModel.js')).GithubRepoModel.findOne({ fullName: `${owner}/${repo}` }).lean();
    const analytics = await collectRepoBranchAnalytics(owner, repo, repoModel);
    return res.status(200).json({ success: true, repo: `${owner}/${repo}`, analytics });
  } catch (err) {
    console.error('getRepoBranchesAnalytics', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getRepoBranchesAnalyticsFromDB = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    if (!owner || !repo) return res.status(400).json({ success: false, message: 'owner and repo required' });
    const GithubRepoModel = (await import('../../models/PlatformModel/GithubRepoModel.js')).GithubRepoModel;
    const BranchAnalyticsModel = (await import('../../models/PlatformModel/BranchAnalyticsModel.js')).BranchAnalyticsModel;
    const repoModel = await GithubRepoModel.findOne({ fullName: `${owner}/${repo}` }).lean();
    if (!repoModel) return res.status(404).json({ success: false, message: 'Repo not found' });
    const entries = await BranchAnalyticsModel.find({ repoId: repoModel.repoId }).lean();
    return res.status(200).json({ success: true, repo: repoModel.fullName, analytics: entries });
  } catch (err) {
    console.error('getRepoBranchesAnalyticsFromDB', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getProjectReposAnalytics = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) return res.status(400).json({ success: false, message: 'projectId required' });
    const GithubRepoModel = (await import('../../models/PlatformModel/GithubRepoModel.js')).GithubRepoModel;
    const repos = await GithubRepoModel.find({ projectId }).lean();
    const concurrency = Math.max(1, Math.min(parseInt(process.env.GITHUB_ANALYTICS_CONCURRENCY || '3', 10), 10));
    const results = [];
    for (let i = 0; i < repos.length; i += concurrency) {
      const chunk = repos.slice(i, i + concurrency);
      const chunkResults = await Promise.all(chunk.map(async (r) => {
        const [owner, repoName] = (r.fullName || '').split('/');
        try {
          const analytics = await collectRepoBranchAnalytics(owner, repoName, r);
          return { repo: r.fullName, analytics };
        } catch (err) {
          return { repo: r.fullName, analytics: [], error: err.message };
        }
      }));
      results.push(...chunkResults);
    }
    return res.status(200).json({ success: true, projectId, analytics: results });
  } catch (err) {
    console.error('getProjectReposAnalytics', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getProjectReposAnalyticsFromDB = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) return res.status(400).json({ success: false, message: 'projectId required' });
    const GithubRepoModel = (await import('../../models/PlatformModel/GithubRepoModel.js')).GithubRepoModel;
    const BranchAnalyticsModel = (await import('../../models/PlatformModel/BranchAnalyticsModel.js')).BranchAnalyticsModel;
    const repos = await GithubRepoModel.find({ projectId }).lean();
    const results = [];
    for (const r of repos) {
      const entries = await BranchAnalyticsModel.find({ repoId: r.repoId }).lean();
      results.push({ repo: r.fullName, entries });
    }
    return res.status(200).json({ success: true, projectId, analytics: results });
  } catch (err) {
    console.error('getProjectReposAnalyticsFromDB', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
