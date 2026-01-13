import fs from "fs";
import jwt from "jsonwebtoken";
import { Octokit } from "@octokit/rest";
import path from "path";
// get github Client id
import { fileURLToPath } from "url";
const APP_ID=process.env.GITHUB_CLIENT_ID

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRIVATE_KEY = fs.readFileSync(
  path.join(__dirname, "themysticsquadapp.2026-01-07.private-key.pem"),
  "utf8"
);



// utility to create the token 
export function getGitJWTToken(){
    const payload={
         iat: Math.floor(Date.now() / 1000) - 60,
        exp: Math.floor(Date.now() / 1000) + 600,
        iss:APP_ID
    }
    return jwt.sign(payload,PRIVATE_KEY,{algorithm:"RS256"})
}

// utility to get the installation id
export function getGitInstallationId(){
    
}

/**
 * Generate the GitHub Authorization URL for OAuth
 * @param {string} projectId 
 * @returns {string}
 */
export function getGithubAuthUrl(projectId) {
  const clientID = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/auth/github/callback`;
  // State can include projectId to know which project to update upon callback
  const state = encodeURIComponent(JSON.stringify({ projectId }));
  
  return `https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${redirectUri}&state=${state}&scope=repo,user`;
}

/**
 * Exchange the authorization code for an access token
 * @param {string} code 
 * @returns {Promise<string>}
 */
export async function exchangeCodeForToken(code) {
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientID,
      client_secret: clientSecret,
      code: code,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

async function getInstallationToken(installationId) {
  const octokit = new octokit({
    auth: createJWT(),
  });

  const { data } = await Octokit.request(
    'POST /app/installations/{installation_id}/access_tokens',
    {
      installation_id: installationId,
    }
  );

  return data.token;
}




async function listRepos(installationToken) {
  const octokit = new Octokit({
    auth: installationToken,
  });

  const { data } = await octokit.request(
    'GET /installation/repositories'
  );

  return data.repositories;
}



// ==============??
import crypto from 'crypto';
import GithubInstallationModel from "../../models/PlatformModel/GithubInstallationModel.js";

export function verifyGithubSignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;

  const payload = req.body;

  const hmac = crypto
    .createHmac('sha256', process.env.GITHUBWEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const expected = `sha256=${hmac}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}


async function handleInstallationEvent(payload) {
  const { action, installation } = payload;

  if (action === 'created') {
    // Optional: log install
    console.log('GitHub App installed:', installation.id);
  }

  if (action === 'deleted') {
    // 🔥 MUST clean up
    await GithubInstallation.deleteOne({
      installationId: installation.id
    });

    console.log('GitHub App uninstalled:', installation.id);
  }
}


async function handleInstallationRepoChange(payload) {
  const { action, installation, repositories_added, repositories_removed } = payload;

  if (action === 'added') {
    console.log(
      'Repos added:',
      repositories_added.map(r => r.full_name)
    );
  }

  if (action === 'removed') {
    console.log(
      'Repos removed:',
      repositories_removed.map(r => r.full_name)
    );
  }
}


async function handlePullRequestEvent(payload) {
  const { action, pull_request, repository } = payload;

  if (!['opened', 'synchronize', 'closed'].includes(action)) return;

  console.log({
    action,
    repo: repository.full_name,
    pr: pull_request.number
  });

  // Optional: store PR in DB
}


async function handlePushEvent(payload) {
  console.log({
    repo: payload.repository.full_name,
    commits: payload.commits.length
  });
}



export async function getInstallationAccessToken(installationId) {
  // 1️⃣ Create JWT
  const jwtToken = jwt.sign(
    {
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) + 600,
      iss: process.env.GITHUB_APP_ID
    },
    PRIVATE_KEY,
    { algorithm: "RS256" }
  );

  // 2️⃣ Exchange for installation token
  const response = await axios.post(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {},
    {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  return response.data.token;
}

export {
  handleInstallationEvent,
  handleInstallationRepoChange,
  handlePullRequestEvent,
  handlePushEvent
}

export async function getUserRepos(userId) {
  const installation = await GithubInstallationModel.findOne({ userId });
  if (!installation) throw new Error("GitHub not connected");

  const token = await getInstallationAccessToken(
    installation.installationId
  );

  const res = await axios.get(
    "https://api.github.com/installation/repositories",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  return res.data.repositories;
}



