// services/githubService.js
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
import GithubRepoModel from "../models/PlatformModel/GithubRepoModel.js";
// import GithubInstallationModel from "../models/PlatformModel/GithubInstallationModel.js";
import BranchAnalyticsModel from "../models/PlatformModel/BranchAnalyticsModel.js";
import GithubInstallationModel from "../models/GithubModels/GithubInstallationModel.js";
dotenv.config();

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Persist repo metadata into the database (upsert)
 * @param {Object} repo - raw Octokit repo object
 * @param {String} partnerId - partnerId to map to
 * @param {String} projectId - projectId to map to
 * @param {ObjectId} connectedBy - user id who connected it
 */
export const upsertRepo = async (repo, partnerId = null, projectId = null, connectedBy = null) => {
  try {
    const repoPayload = {
      repoId: String(repo.id),
      fullName: repo.full_name,
      name: repo.name,
      owner: {
        id: String(repo.owner?.id || repo.owner?.node_id || ''),
        login: repo.owner?.login,
        type: repo.owner?.type,
      },
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      description: repo.description || '',
      defaultBranch: repo.default_branch || 'main',
      private: !!repo.private,
      fork: !!repo.fork,
      language: repo.language,
      topics: repo.topics || [],
      size: repo.size || 0,
      watchersCount: repo.watchers_count || 0,
      stargazersCount: repo.stargazers_count || 0,
      forksCount: repo.forks_count || 0,
      openIssuesCount: repo.open_issues_count || 0,
      partnerId,
      projectId,
      connectedBy,
      lastSyncedAt: new Date(),
      metadata: repo,
    };

    const updated = await GithubRepoModel.findOneAndUpdate(
      { repoId: repoPayload.repoId },
      { $set: repoPayload },
      { upsert: true, new: true }
    );
    return updated;
  } catch (err) {
    console.error('Error upserting repo:', err);
    throw err;
  }
};

export const upsertInstallation = async (installation, partnerId = null, connectedBy = null) => {
  try {
    const payload = {
      installationId: installation.id,
      appId: installation.app_id,
      account: installation.account,
      partnerId,
      connectedBy,
      isActive: true,
      permissions: installation.permissions || {},
      config: installation.config || {},
      lastRefreshedAt: new Date(),
    };
    const updated = await GithubInstallationModel.findOneAndUpdate(
      { installationId: payload.installationId },
      { $set: payload },
      { upsert: true, new: true }
    );
    return updated;
  } catch (err) {
    console.error('Error upserting installation:', err);
    throw err;
  }
};

/**
 * Collect branch level analytics for a repository
 * The function will query GitHub API for branches, PRs, workflow runs and compute simple metrics.
 * Returns an array of branch analytics entries
 */
export const collectRepoBranchAnalytics = async (owner, repo, repoModel = null) => {
  try {
    // 1) List branches
    const { data: branches } = await octokit.repos.listBranches({ owner, repo, per_page: 100 });

    const results = [];
    for (const b of branches) {
      const branchName = b.name;
      // Get branch commit details
      const { data: branchDetail } = await octokit.repos.getBranch({ owner, repo, branch: branchName });
      const lastCommitSha = branchDetail.commit?.sha;
      const lastCommitDate = branchDetail.commit?.commit?.author?.date ? new Date(branchDetail.commit.commit.author.date) : null;

      // 2) PR metrics: find PRs where head is branch
      // head filter requires owner:branch
      let prs = [];
      try {
        const { data: prData } = await octokit.pulls.list({ owner, repo, state: 'all', head: `${owner}:${branchName}`, per_page: 100 });
        prs = prData;
      } catch (err) {
        console.warn('Failed to fetch PRs for', owner, repo, branchName, err.message);
      }

      const prsCount = prs.length;
      const closedPrsCount = prs.filter(p => p.state === 'closed').length;
      const mergedPrsCount = prs.filter(p => p.merged_at).length;

      // 3) Comments count (sum of issue comments + review comments across PRs)
      let commentsCount = 0;
      for (const pr of prs) {
        commentsCount += (pr.comments || 0) + (pr.review_comments || 0);
      }

      // 4) Build/workflow runs for branch
      let buildRunsCount = 0;
      let buildFailuresCount = 0;
      try {
        const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({ owner, repo, branch: branchName, per_page: 100 });
        buildRunsCount = (runs || {}).total_count || 0;
        if (runs && runs.workflow_runs) {
          buildFailuresCount = runs.workflow_runs.filter(r => r.conclusion && ['failure', 'cancelled', 'timed_out'].includes(r.conclusion)).length;
        }
      } catch (err) {
        console.warn('Failed to fetch workflow runs for', owner, repo, branchName, err.message);
      }

      const analytics = {
        repoId: String(repoModel?.repoId || `${owner}/${repo}`),
        branchName,
        branchCreator: {
          id: branchDetail.commit?.author?.id || branchDetail.commit?.commit?.author?.name || null,
          login: branchDetail.commit?.author?.login || null,
          name: branchDetail.commit?.commit?.author?.name || null,
          email: branchDetail.commit?.commit?.author?.email || null,
        },
        lastCommitSha,
        lastCommitDate,
        prsCount,
        closedPrsCount,
        mergedPrsCount,
        commentsCount,
        buildRunsCount,
        buildFailuresCount,
        metadata: {
          branchDetail: branchDetail || {},
        },
        lastSyncedAt: new Date(),
      };

      // upsert into BranchAnalyticsModel
      try {
        await BranchAnalyticsModel.findOneAndUpdate(
          { repoId: analytics.repoId, branchName: analytics.branchName },
          { $set: analytics },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn('Failed to upsert branch analytics:', err.message);
      }

      results.push(analytics);
    }
    return results;
  } catch (err) {
    console.error('Error in collectRepoBranchAnalytics:', err);
    throw err;
  }
};
