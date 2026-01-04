#!/usr/bin/env node
/*
  Script to call velocity-related endpoints on the running backend.
  Usage:
    node scripts/velocityRoutes.js --route all --host http://localhost:8000 --owner amitosh2002 --repo Backend_SD --token <bearer>
    node scripts/velocityRoutes.js --route velocity --owner owner --repo repo --since 2025-01-01 --until 2025-01-31
    node scripts/velocityRoutes.js --route developer --owner owner --repo repo [--since --until]
    node scripts/velocityRoutes.js --route team --repos owner/repo,owner2/repo2 [--since --until]
    node scripts/velocityRoutes.js --route compare --owner owner --repo repo --sinceA 2025-01-01 --untilA 2025-01-07 --sinceB 2025-02-01 --untilB 2025-02-07

  Notes:
  - If --route all is specified it will call all endpoints in order and print results.
  - --token (optional) is sent as `Authorization: Bearer <token>` header.
*/

import dotenv from 'dotenv';
dotenv.config();

const args = process.argv.slice(2);

function parseArgs(argsList) {
  const argv = {};
  for (let i = 0; i < argsList.length; i++) {
    const a = argsList[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argsList[i + 1];
      if (!next || next.startsWith('--')) {
        argv[k] = true; // flags
      } else {
        argv[k] = next;
        i++;
      }
    }
  }
  return argv;
}

const argv = parseArgs(args);

const host = argv.host || process.env.BACKEND_HOST || 'http://localhost:8000';
const route = (argv.route || 'all').toLowerCase();
const owner = argv.owner || argv.o;
const repo = argv.repo || argv.r;
const repos = argv.repos; // comma separated 'owner/repo,owner2/repo2'

const since = argv.since;
const until = argv.until;

const token = argv.token || process.env.AUTH_TOKEN || null; // optional bearer token

function buildUrl(path, qparams) {
  const url = new URL(`${host}${path}`);
  if (qparams && typeof qparams === 'object') {
    Object.keys(qparams).forEach(k => {
      if (qparams[k] !== undefined && qparams[k] !== false && qparams[k] !== null) url.searchParams.set(k, qparams[k]);
    });
  }
  return url.toString();
}

async function fetchJson(url, method = 'GET') {
  const headers = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(url, { method, headers });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch (e) { body = text; }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: err.message || err };
  }
}

async function callVelocity() {
  if (!owner || !repo) {
    console.error('owner and repo are required for /velocity');
    return;
  }
  const q = {};
  if (since) q.since = since;
  if (until) q.until = until;
  const url = buildUrl(`/api/ai/velocity`, { owner, repo, ...q });
  console.log('Calling', url);
  const r = await fetchJson(url);
  console.log('Response:', JSON.stringify(r, null, 2));
}

async function callDeveloper() {
  if (!owner || !repo) {
    console.error('owner and repo are required for /velocity/developer');
    return;
  }
  const q = {};
  if (since) q.since = since;
  if (until) q.until = until;
  const url = buildUrl(`/api/ai/velocity/developer`, { owner, repo, ...q });
  console.log('Calling', url);
  const r = await fetchJson(url);
  console.log('Response:', JSON.stringify(r, null, 2));
}

async function callTeam() {
  if (!repos) {
    console.error('repos is required for /velocity/team (format owner/repo,owner2/repo2)');
    return;
  }
  const q = { repos };
  if (since) q.since = since;
  if (until) q.until = until;
  const url = buildUrl(`/api/ai/velocity/team`, q);
  console.log('Calling', url);
  const r = await fetchJson(url);
  console.log('Response:', JSON.stringify(r, null, 2));
}

async function callCompare() {
  if (!owner || !repo) {
    console.error('owner and repo are required for /velocity/compare');
    return;
  }
  const q = {};
  if (argv.sinceA) q.sinceA = argv.sinceA;
  if (argv.untilA) q.untilA = argv.untilA;
  if (argv.sinceB) q.sinceB = argv.sinceB;
  if (argv.untilB) q.untilB = argv.untilB;
  const url = buildUrl(`/api/ai/velocity/compare`, { owner, repo, ...q });
  console.log('Calling', url);
  const r = await fetchJson(url);
  console.log('Response:', JSON.stringify(r, null, 2));
}

async function main() {
  try {
    if (route === 'all' || route === 'velocity') await callVelocity();
    if (route === 'all' || route === 'developer') await callDeveloper();
    if (route === 'all' || route === 'team') await callTeam();
    if (route === 'all' || route === 'compare') await callCompare();
  } catch (err) {
    console.error('Error during calls', err);
  }
}

main();
