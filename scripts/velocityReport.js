#!/usr/bin/env node
/*
  utility script to compute DORA metrics for a repo using Octokit.
  Usage: node scripts/velocityReport.js owner repo [since] [until]
*/
import dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';
import { computeDoraMetrics } from '../services/metricsService.js';
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
      const { numericMetrics, samplePRs, sampleIncidents } = await computeDoraMetrics({ octokit, owner, repo, since, until });

    console.log(JSON.stringify({ success: true, metrics: numericMetrics, samplePRs, sampleIncidents }, null, 2));
  } catch (err) {
    console.error('Error while computing velocity:', err.message || err);
    process.exit(1);
  }
}

run();
