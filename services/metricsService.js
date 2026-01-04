// services/metricsService.js
import { octokit as defaultOctokit } from './githubServices.js';

/**
 * Compute DORA-style metrics for a repo given an Octokit client.
 * Returns numeric metrics + sample PRs + sample incidents.
 *
 * @param {Object} opts
 * @param {import('@octokit/rest').Octokit} opts.octokit - Octokit client instance (defaults to defaultOctokit)
 * @param {string} opts.owner - owner/org for the repo
 * @param {string} opts.repo - repo name
 * @param {Date} [opts.since] - start date
 * @param {Date} [opts.until] - end date
 */
export async function computeDoraMetrics({ octokit = defaultOctokit, owner, repo, since = new Date(Date.now() - 30 * 24 * 3600 * 1000), until = new Date() }) {
  const timeWindowDays = (until - since) / (1000 * 3600 * 24) || 1;

  // 1) Deployments (wrap in try/catch to handle 401/403 gracefully)
  let deployments = [];
  try {
    const deploymentsResp = await octokit.rest.repos.listDeployments({ owner, repo, per_page: 200 });
    deployments = (deploymentsResp.data || []).filter(d => {
    const created = new Date(d.created_at || d.created || d.updated_at || Date.now());
    const env = (d.environment || '').toLowerCase();
    return created >= since && created <= until && (env === 'production' || env === 'prod' || !env);
  });
  } catch (err) {
    console.warn('Failed to list deployments, likely insufficient token scope or 401/403 for', owner + '/' + repo, err.message || err);
    deployments = [];
  }
  const deploymentFrequency = deployments.length / timeWindowDays;

  // 2) Lead Time for Changes
  const leadTimes = [];
  for (const dep of deployments) {
    try {
      const sha = dep.sha;
      if (!sha) continue;
      const commitResp = await octokit.rest.repos.getCommit({ owner, repo, ref: sha });
      const commitTime = new Date(commitResp.data.commit.author.date);
      const statusesResp = await octokit.rest.repos.listDeploymentStatuses({ owner, repo, deployment_id: dep.id, per_page: 10 });
      const status = statusesResp.data[0];
      const completedAt = status ? new Date(status.created_at || status.updated_at || dep.updated_at || dep.created_at) : new Date(dep.created_at);
      const ms = completedAt - commitTime;
      if (ms >= 0) leadTimes.push(ms);
    } catch (err) {
      console.warn('LT calc error for dep', dep.id, err.message || err);
    }
  }
  const avgLeadTimeMs = leadTimes.length ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : null;

  // 3) Change Failure Rate
  let workflowRuns = [];
  try {
    const workflowRunsResp = await octokit.rest.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 200, status: 'completed' });
    workflowRuns = (workflowRunsResp.data.workflow_runs || []).filter((w) => {
      const runAt = new Date(w.created_at);
      return runAt >= since && runAt <= until;
    });
  } catch (err) {
    console.warn('Failed to fetch workflow runs for CFR', owner, repo, err.message || err);
    workflowRuns = [];
  }
  const totalDeployOrRuns = Math.max(deployments.length, workflowRuns.length);
  const failedRuns = workflowRuns.filter(w => w.conclusion === 'failure' || w.conclusion === 'cancelled' || w.conclusion === 'timed_out').length;
  const changeFailureRate = totalDeployOrRuns ? (failedRuns / totalDeployOrRuns) * 100 : 0;

  // 4) MTTR
  let incidents = [];
  try {
    const incidentIssuesResp = await octokit.rest.issues.listForRepo({ owner, repo, per_page: 200, since: since.toISOString() });
    incidents = (incidentIssuesResp.data || []).filter(i => {
      const created = new Date(i.created_at);
      return created >= since && created <= until && (i.labels || []).some(l => (typeof l === 'string' ? l : l.name || '').toLowerCase().includes('incident'));
    });
  } catch (err) {
    console.warn('Failed to fetch incidents', owner, repo, err.message || err);
  }
  const mttrList = [];
  for (const inc of incidents) {
    if (!inc.closed_at) continue;
    const started = new Date(inc.created_at);
    const resolved = new Date(inc.closed_at);
    const ms = resolved - started;
    if (ms >= 0) mttrList.push(ms);
  }
  const avgMttrMs = mttrList.length ? Math.round(mttrList.reduce((a, b) => a + b, 0) / mttrList.length) : null;

  // 5) PRs and PR sizes
  const prsResp = await octokit.rest.pulls.list({ owner, repo, state: 'closed', per_page: 200 });
  const mergedPRs = (prsResp.data || []).filter(pr => pr.merged_at && new Date(pr.merged_at) >= since && new Date(pr.merged_at) <= until);
  const prSizes = mergedPRs.map(p => (p.additions || 0) + (p.deletions || 0));
  const avgPrSize = prSizes.length ? Math.round(prSizes.reduce((a, b) => a + b, 0) / prSizes.length) : 0;
  const codeChurnPercent = avgPrSize > 0 ? Math.round(((mergedPRs.reduce((acc, p) => acc + (p.deletions || 0), 0)) / avgPrSize) * 100) : 0;

  function msToHuman(ms) {
    if (ms == null) return null;
    const s = Math.round(ms / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${hh}h ${mm}m ${ss}s`;
  }

  const numericMetrics = {
    deploymentFrequency_per_day: Number(deploymentFrequency.toFixed(2)),
    deployments_count: deployments.length,
    avgLeadTimeMs,
    avgLeadTimeHuman: msToHuman(avgLeadTimeMs),
    changeFailureRatePercent: Number(changeFailureRate.toFixed(2)),
    mttrMs: avgMttrMs,
    mttrHuman: msToHuman(avgMttrMs),
    mergedPRCount: mergedPRs.length,
    avgPRSizeLines: avgPrSize,
    codeChurnPercent
  };

  const samplePRs = mergedPRs.slice(0, 6).map(p => ({ number: p.number, title: p.title, merged_at: p.merged_at, additions: p.additions, deletions: p.deletions, url: p.html_url, author: p.user?.login }));
  const sampleIncidents = incidents.slice(0, 6).map(i => ({ number: i.number, title: i.title, created_at: i.created_at, closed_at: i.closed_at, url: i.html_url }));

  return { numericMetrics, samplePRs, sampleIncidents };
}

/**
 * Compute developer-level metrics: returns map of developer -> metrics (mergedPRs, avgPRSize)
 */
export async function computeDeveloperMetrics({ octokit = defaultOctokit, owner, repo, since = new Date(Date.now() - 30 * 24 * 3600 * 1000), until = new Date() }) {
  const prsResp = await octokit.rest.pulls.list({ owner, repo, state: 'closed', per_page: 300 });
  const mergedPRs = (prsResp.data || []).filter(pr => pr.merged_at && new Date(pr.merged_at) >= since && new Date(pr.merged_at) <= until);
  const devMap = {};
  for (const pr of mergedPRs) {
    const author = pr.user?.login || 'unknown';
    if (!devMap[author]) devMap[author] = { mergedPRs: 0, additions: 0, deletions: 0 };
    devMap[author].mergedPRs += 1;
    devMap[author].additions += pr.additions || 0;
    devMap[author].deletions += pr.deletions || 0;
  }
  Object.keys(devMap).forEach(k => {
    const d = devMap[k];
    d.avgPRSizeLines = Math.round((d.additions + d.deletions) / d.mergedPRs);
  });
  return devMap;
}

/**
 * Compare two metrics objects and return a delta summary.
 */
export function compareMetrics(a, b) {
  const keys = Object.keys(a || {});
  const delta = {};
  for (const k of keys) {
    if (typeof a[k] === 'number' && typeof b[k] === 'number') {
      delta[k] = b[k] - a[k];
    } else {
      delta[k] = { from: a[k], to: b[k] };
    }
  }
  return delta;
}

export default {
  computeDoraMetrics,
  computeDeveloperMetrics,
  compareMetrics,
};
