import fs from "fs";
import jwt from "jsonwebtoken";
import { Octokit } from "@octokit/rest";
import path from "path";
// get github Client id
import { fileURLToPath } from "url";
import axios from "axios";
const APP_ID=process.env.GITHUB_APP_ID

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRIVATE_KEY = fs.readFileSync(
  path.join(__dirname, "themysticsquadapp.2026-01-07.private-key.pem"),
  "utf8"
);

// ==== new flow actions =======

// utility to create the token 
export function getGitJWTToken(){
    console.log("[getGitJWTToken] Generating JWT...");
    const payload={
         iat: Math.floor(Date.now() / 1000) - 60,
        exp: Math.floor(Date.now() / 1000) + 600,
        iss:APP_ID
    }
    const token = jwt.sign(payload,PRIVATE_KEY,{algorithm:"RS256"});
    console.log("[getGitJWTToken] JWT generated successfully");
    return token;
}






// export async function getInstallationAccessToken(installationId) {
//   const jwtToken = getGitJWTToken();

//   const octokit = new Octokit({
//     auth: jwtToken,
//   });

//   const { data } = await octokit.apps.createInstallationAccessToken({
//     installation_id: installationId,
//   });

//   return data.token; // 👈 THIS is the real token you use later
// }



// ==== new flow actions =======

// utility to get the installation id
export function getGitInstallationId(){
    
}

/**
 * Generate the GitHub Authorization URL for OAuth
 * @param {string} projectId 
 * @returns {string}
 */
export function getGithubAuthUrl(projectId) {
  console.log("[getGithubAuthUrl] Generating Auth URL for project:", projectId);
  const clientID = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/auth/github/callback`;
  // State can include projectId to know which project to update upon callback
  const state = encodeURIComponent(JSON.stringify({ projectId }));
  
  const url = `https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${redirectUri}&state=${state}&scope=repo,user`;
  console.log("[getGithubAuthUrl] Generated URL:", url);
  return url;
}

/**
 * Exchange the authorization code for an access token
 * @param {string} code 
 * @returns {Promise<string>}
 */
export async function exchangeCodeForToken(code) {
  console.log("[exchangeCodeForToken] Exchanging code for token...");
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  try {
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
      console.error("[exchangeCodeForToken] GitHub OAuth error:", data.error_description || data.error);
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    console.log("[exchangeCodeForToken] Token exchanged successfully");
    return data.access_token;
  } catch (error) {
    console.error("[exchangeCodeForToken] Error exchanging code:", error.message);
    throw error;
  }
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
import GithubInstallationModel from "../../models/GithubModels/GithubInstallationModel.js";
// import GithubInstallationModel from "../../models/PlatformModel/GithubInstallationModel.js";

export function verifyGithubSignature(req) {
  console.log("[verifyGithubSignature] Verifying signature...");
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    console.warn("[verifyGithubSignature] No signature found in headers");
    return false;
  }

  const payload = req.body;

  const hmac = crypto
    .createHmac('sha256', process.env.GITHUBWEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const expected = `sha256=${hmac}`;

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );

  console.log("[verifyGithubSignature] Signature valid:", isValid);
  return isValid;
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


// ===================== APP Version helper =====




export async function getInstallationAccessToken(installationId) {
  console.log("[getInstallationAccessToken] Fetching token for installation:", installationId);
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

  try {
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

    console.log("[getInstallationAccessToken] Token fetched successfully");
    return response.data.token;
  } catch (error) {
    console.error("[getInstallationAccessToken] Error fetching installation token:", error.response?.data || error.message);
    throw error;
  }
}


export async function getCommitStatus({
  owner,
  repo,
  sha,
  installationToken
}) {
  const res = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/status`,
    {
      headers: {
        Authorization: `Bearer ${installationToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  return {
    state: res.data.state, // success | failure | pending
    total: res.data.total_count,
    statuses: res.data.statuses,
  };
}

export {
  handleInstallationEvent,
  handleInstallationRepoChange,
  handlePullRequestEvent,
  handlePushEvent
}

export async function getUserRepos(userId) {
  console.log("[getUserRepos] Fetching repos for user:", userId);
  try {
    const installation = await GithubInstallationModel.findOne({ userId });
    if (!installation) {
      console.warn("[getUserRepos] GitHub not connected for user:", userId);
      throw new Error("GitHub not connected");
    }

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

    console.log("[getUserRepos] Successfully fetched", res.data.repositories.length, "repositories");
    return res.data.repositories;
  } catch (error) {
    console.error("[getUserRepos] Error fetching repos:", error.message);
    throw error;
  }
}



