#!/usr/bin/env node
/*
  utility script to compute DORA metrics for a repo using Octokit.
  Usage: node scripts/velocityReport.js owner repo [since] [until]
*/
import dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';
dotenv.config();

const args = process.argv.slice(2);
const owner = args[0] || 'amitosh2002';
const repo = args[1] || 'Backend_SD';
const since = args[2] ? new Date(args[2]) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
const until = args[3] ? new Date(args[3]) : new Date();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

function msToHuman(ms) {
  if (ms == null) return null;
  const s = Math.round(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${hh}h ${mm}m ${ss}s`;
}

async function run() {
  try {
    // 1) Deployments
    const deploymentsResp = await octokit.rest.repos.listDeployments({ owner, repo, per_page: 200 });
    const deployments = (deploymentsResp.data || []).filter(d => {
      const created = new Date(d.created_at || d.created || d.updated_at || Date.now());
      const env = (d.environment || '').toLowerCase();
      return created >= since && created <= until && (env === 'production' || env === 'prod' || !env);
    });
    const timeWindowDays = (until - since) / (1000 * 3600 * 24) || 1;
    const deploymentFrequency = deployments.length / timeWindowDays;

    // 2) Lead time for changes
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
    const avgLeadTimeMs = leadTimes.length ? Math.round(leadTimes.reduce((a,b)=>a+b,0)/leadTimes.length) : null;

    // 3) Change Failure Rate
    const workflowRunsResp = await octokit.rest.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 200, status: 'completed' });
    const workflowRuns = (workflowRunsResp.data.workflow_runs || []).filter(w => {
      const runAt = new Date(w.created_at);
      return runAt >= since && runAt <= until;
    });
    const totalDeployOrRuns = Math.max(deployments.length, workflowRuns.length);
    const failedRuns = workflowRuns.filter(w => w.conclusion === 'failure' || w.conclusion === 'cancelled').length;
    const changeFailureRate = totalDeployOrRuns ? (failedRuns / totalDeployOrRuns)*100 : 0;

    // 4) MTTR - issues with 'incident' label
    const incidentIssuesResp = await octokit.rest.issues.listForRepo({ owner, repo, per_page: 200, since: since.toISOString() });
    const incidents = (incidentIssuesResp.data || []).filter(i => {
      const created = new Date(i.created_at);
      return created >= since && created <= until && (i.labels || []).some(l => (typeof l === 'string' ? l : l.name || '').toLowerCase().includes('incident'));
    });
    const mttrList = [];
    for (const inc of incidents) {
      if (!inc.closed_at) continue;
      const started = new Date(inc.created_at);
      const resolved = new Date(inc.closed_at);
      const ms = resolved - started;
      if (ms >= 0) mttrList.push(ms);
    }
    const avgMttrMs = mttrList.length ? Math.round(mttrList.reduce((a,b)=>a+b,0)/mttrList.length) : null;

    // 5) PRs and PR sizes
    const prsResp = await octokit.rest.pulls.list({ owner, repo, state: 'closed', per_page: 200 });
    const mergedPRs = (prsResp.data || []).filter(pr => pr.merged_at && new Date(pr.merged_at) >= since && new Date(pr.merged_at) <= until);
    const prSizes = mergedPRs.map(p => (p.additions || 0) + (p.deletions || 0));
    const avgPrSize = prSizes.length ? Math.round(prSizes.reduce((a,b)=>a+b,0)/prSizes.length) : 0;
    const codeChurnPercent = avgPrSize > 0 ? Math.round(((mergedPRs.reduce((acc,p)=>acc+(p.deletions||0),0)) / avgPrSize) * 100) : 0;

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

    console.log(JSON.stringify({ success: true, metrics: numericMetrics, samplePRs, sampleIncidents }, null, 2));
  } catch (err) {
    console.error('Error while computing velocity:', err.message || err);
    process.exit(1);
  }
}

run();
