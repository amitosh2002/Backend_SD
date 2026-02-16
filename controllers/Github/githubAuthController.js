import { Octokit } from "@octokit/rest";
import { getGithubAuthUrl, exchangeCodeForToken, handleInstallationRepoChange, handleInstallationEvent, handlePushEvent, handlePullRequestEvent, verifyGithubSignature, getGitJWTToken, getInstallationAccessToken, getCommitStatus } from "../../config/GithubConfigs/githubUtility.js";
import GithubInstallationModel from "../../models/GithubModels/GithubInstallationModel.js";
import GithubRepositorySchema from "../../models/GithubModels/GithubRepositorySchema.js";
import { GithubConfigModel } from "../../models/PlatformModel/GithubConfigModel.js";
import GithubRepoModel from "../../models/PlatformModel/GithubRepoModel.js";
// import GithubInstallationModel from "../../models/PlatformModel/GithubInstallationModel.js";
import { encrypt } from "../../utility/securityUtility.js";
import axios from "axios";
// ======================================================Not using======================

/**
 * Redirect the user to GitHub for authorization
 */
export const redirectToGithub = async (req, res) => {
  console.log("[redirectToGithub] Request received with query:", req.query);
  try {
    const { projectId } = req.query;
    if (!projectId) {
      console.warn("[redirectToGithub] ProjectId missing");
      return res.status(400).json({ success: false, message: "projectId is required" });
    }
    const authUrl = getGithubAuthUrl(projectId);
    console.log("[redirectToGithub] Redirecting to:", authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error("[redirectToGithub] Error:", error);
    res.status(500).json({ success: false, message: "Failed to initiate GitHub auth" });
  }
};

/**
 * Handle the callback from GitHub after user authorization
 */
export const handleGithubCallback = async (req, res) => {
  console.log("[handleGithubCallback] Callback received with query:", req.query);
  try {
    const { code, state } = req.query;
    if (!code) {
      console.warn("[handleGithubCallback] Authorization code missing");
      return res.status(400).json({ success: false, message: "Authorization code missing" });
    }

    // Decode state to get projectId
    const decodedState = JSON.parse(decodeURIComponent(state));
    const { projectId } = decodedState;
    console.log("[handleGithubCallback] Extracted projectId:", projectId);

    if (!projectId) {
      console.warn("[handleGithubCallback] ProjectId missing in state");
      return res.status(400).json({ success: false, message: "ProjectId missing in state" });
    }

    // Exchange code for token
    const accessToken = await exchangeCodeForToken(code);
    console.log("[handleGithubCallback] Access token obtained");

    // Store token in GithubConfigModel (encrypted)
    const projectConfig = await GithubConfigModel.findOneAndUpdate(
      { projectId },
      {
        githubSecretCode: encrypt(accessToken),
        updatedBy: req.user?.id || 'SYSTEM',
        isActive: true
      },
      { upsert: true, new: true }
    );

    console.log("[handleGithubCallback] GitHub account linked successfully for project:", projectId);
    res.status(200).json({
      success: true,
      message: "GitHub account linked successfully",
      projectId: projectConfig.projectId
    });
  } catch (error) {
    console.error("[handleGithubCallback] Error:", error);
    res.status(500).json({ success: false, message: "Failed to handle GitHub callback", error: error.message });
  }
};
// ======================================================Not using======================



// ============================Github controller for space work station===========================
// setup controller // this controller is for initial setup of the github installation for projects
export const setupInstallationGithub = async(req,res)=>{
  console.log("[setupInstallationGithub] Request received with query:", req.query, "for user:", req.user?.userId);
  try {
    const userId= req.user.userId

    const { installation_id ,projectId} = req.body;
    if (!installation_id) {
        console.warn("[setupInstallationGithub] installation_id missing");
        return res.status(400).json({ success: false, message: "installation_id is required" });
    }
    if (!projectId) {
        console.warn("[setupInstallationGithub] projectId missing");
        return res.status(400).json({ success: false, message: "projectId is required" });
    }


    // Now generate the token for the installation
    const jwt = getGitJWTToken();
    console.log("[setupInstallationGithub] JWT token generated:", jwt);


    // post api call for getting the access token
     const tokenRes = await axios.post(
        `https://api.github.com/app/installations/${installation_id}/access_tokens`,
        {},
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      const accessToken = tokenRes.data.token;
    console.log("[setupInstallationGithub] Installation token generated:", accessToken);

    // Fetch all the repositories for the installation
    const reposRes = await axios.get(
        `https://api.github.com/installation/repositories`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

    const repositories = reposRes.data.repositories;
    console.log("[setupInstallationGithub] Repositories fetched:", repositories);

    // Map GitHub API fields to our schema
    const mappedRepos = repositories.map(repo => ({
      repoId: String(repo.id),
      name: repo.name,
      fullName: repo.full_name,
      owner: {
        id: String(repo.owner.id),
        login: repo.owner.login,
        type: repo.owner.type,
        avatarUrl: repo.owner.avatar_url
      },
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      description: repo.description,
      defaultBranch: repo.default_branch,
      private: repo.private,
      fork: repo.fork,
      language: repo.language,
      installationId: Number(installation_id),
      connectedBy: userId
    }));
    const updatedRepoWithPid = mappedRepos.map(repo => ({
      ...repo,
      projectId: projectId
    }));

    const repoOps = updatedRepoWithPid.map(repo => ({
      updateOne: {
        filter: { repoId: Number(repo.repoId) },
        update: {
          $set: {
            installationId: repo.installationId,
            repoId: Number(repo.repoId),
            name: repo.name,
            fullName: repo.fullName,
            private: repo.private,
            owner: {
              id: String(repo.owner.id),
              login: repo.owner.login,
              type: repo.owner.type,
              avatarUrl: repo.owner.avatarUrl
            },
            url: repo.htmlUrl,
            defaultBranch: repo.defaultBranch,
            projectId: repo.projectId,
            active: true,
            addedAt: new Date()
          }
        },
        upsert: true
      }
    }));

    if (repoOps.length > 0) {
      await GithubRepositorySchema.bulkWrite(repoOps);
      console.log(`[setupInstallationGithub] Successfully bulk wrote ${repoOps.length} repositories to GithubRepository model`);
      console.log(repoOps)
    }
    await GithubInstallationModel.findOneAndUpdate(
      {projectId:projectId},
      {
        userId: userId,
        installationId: Number(installation_id),
        provider: 'github',
        accessToken: accessToken ,
        projectId:projectId
      },
      { upsert: true, new: true }
    );

    console.log("[setupInstallationGithub] Installation setup successful for user:", userId, "installationId:", installation_id);
    
    return res.status(200).json({
      success: true,
      message: "Installation setup successful",
      redirectUrl: `${process.env.FRONTEND_URL}/workspace/${projectId}/setting`
    });
  } catch (error) {
    console.error("[setupInstallationGithub] Error:", error);
    res.status(500).json({ success: false, message: "Failed to setup installation" });
  }
}




// =============================fetching the accessToken ==========================================
// export const getAccessToken 


export const createInstallationToken =async(installation_id) => {
  try {
    if (!installation_id) {
      console.warn("[getAccessToken] installation_id missing");
      return res.status(400).json({ success: false, message: "installation_id is required" });
    }

    // Now generate the token for the installation
    const jwt = getGitJWTToken();
    console.log("[getAccessToken] JWT token generated:", jwt);

    // post api call for getting the access token
    const tokenRes = await axios.post(
      `https://api.github.com/app/installations/${installation_id}/access_tokens`,
      {},
      { headers: { Authorization: `Bearer ${jwt}` } }
    );

    const accessToken = tokenRes.data.token;
    console.log("[getAccessToken] Installation token generated:", accessToken);
    return accessToken;


  } catch (error) {
    console.error("[getAccessToken] Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate access token" });
  }
}






export const createBranchV3 = async (req, res) => {
  try {
    const {
      // installationId,
      // owner,
      projectId,
      // repo,
      baseBranch = "main",
      newBranch,
    } = req.body;




    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "projectId is required",
      });
    }


    // const repodetails = await GithubInstallationModel.findOne({projectId:projectId})
    // if (!repodetails) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Repository not found",
    //   });
    // }

    const repodetails = await GithubRepositorySchema.findOne({projectId:projectId})
    if (!repodetails) {
      return res.status(404).json({
        success: false,
        message: "Repository not found",
      });
    }
    const installationId = repodetails.installationId;
    const owner = repodetails.owner.login;
    const repo = repodetails.name;

    // Basic validation
    if (!installationId || !owner || !repo || !newBranch) {
      return res.status(400).json({
        success: false,
        message: "installationId, owner, repo and newBranch are required",
      });
    }

    // 1️⃣ Get installation access token
      const installationToken = await getInstallationAccessToken(installationId);

      const octokit = new Octokit({
        auth: installationToken,
      });


    // 3️⃣ Get base branch SHA
    const { data: baseRef } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });

    const baseSha = baseRef.object.sha;

    // 4️⃣ Create new branch
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranch}`,
      sha: baseSha,
    });

    return res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: {
        owner,
        repo,
        baseBranch,
        newBranch,
      },
    });
  } catch (error) {
    // Handle known GitHub errors
    if (error.status === 422) {
      return res.status(409).json({
        success: false,
        message: "Branch already exists",
      });
    }

    if (error.status === 403) {
      return res.status(403).json({
        success: false,
        message: "GitHub App does not have permission to create branches",
      });
    }

    console.error("Create branch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create branch",
    });
  }
};


// psudo code
// 1. get the installation token
// 2. get the commit status
// 3. return the commit status

export const getCommitStatusForBranch = async(req,res)=>{
  try {
    const {owner,repo,sha,installationToken} = req.body;
    const commitStatus = await getCommitStatus({owner,repo,sha,installationToken});
    return res.status(200).json({
      success: true,
      message: "Commit status fetched successfully",
      data: commitStatus,
    });
  } catch (error) {
    console.error("Get commit status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get commit status",
    });
  }
}
// webhook controller 



export const webhookHandler =async (req, res) => {
  console.log("[webhookHandler] Webhook received");
  try {
    // 1️⃣ Verify signature
    if (!verifyGithubSignature(req)) {
      console.warn("[webhookHandler] Invalid signature");
      return res.status(401).send('Invalid signature');
    }

    // 2️⃣ Read event
    const event = req.headers['x-github-event'];
    console.log("[webhookHandler] Event type:", event);
    const payload = JSON.parse(req.body.toString());

    // 3️⃣ Route events
    switch (event) {
      case 'installation':
        console.log("[webhookHandler] Handling installation event");
        await handleInstallationEvent(payload);
        break;

      case 'installation_repositories':
        console.log("[webhookHandler] Handling installation_repositories event");
        await handleInstallationRepoChange(payload);
        break;

      case 'pull_request':
        console.log("[webhookHandler] Handling pull_request event");
        await handlePullRequestEvent(payload);
        break;

      case 'push':
        console.log("[webhookHandler] Handling push event");
        await handlePushEvent(payload);
        break;

      default:
        console.log(`[webhookHandler] Unhandled GitHub event: ${event}`);
    }

    console.log("[webhookHandler] Event processed successfully");
    // 4️⃣ ACK GitHub immediately
    res.status(200).send('OK');
  } catch (err) {
    console.error('[webhookHandler] Error:', err);
    res.status(500).send('Webhook processing failed');
  }
}



// ============================Github controller for space work station===========================
