import { getGithubAuthUrl, exchangeCodeForToken, handleInstallationRepoChange, handleInstallationEvent, handlePushEvent, handlePullRequestEvent, verifyGithubSignature } from "../../config/GithubConfigs/githubUtility.js";
import { GithubConfigModel } from "../../models/PlatformModel/GithubConfigModel.js";
import GithubInstallationModel from "../../models/PlatformModel/GithubInstallationModel.js";
import { encrypt } from "../../utility/securityUtility.js";

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

// setup controller 
export const setupInstallationGithub = async(req,res)=>{
  console.log("[setupInstallationGithub] Request received with query:", req.query, "for user:", req.user?.userId);
  try {
    const userId= req.user.userId
    const { installation_id } = req.query;

    if (!installation_id) {
        console.warn("[setupInstallationGithub] installation_id missing");
        return res.status(400).json({ success: false, message: "installation_id is required" });
    }

    await GithubInstallationModel.create({
        userId: userId,
        installationId: Number(installation_id),
        provider: 'github'
    });

    console.log("[setupInstallationGithub] Installation setup successful for user:", userId, "installationId:", installation_id);
    res.redirect(`${process.env.FRONTEND_URL}/test`);
  } catch (error) {
    console.error("[setupInstallationGithub] Error:", error);
    res.status(500).json({ success: false, message: "Failed to setup installation" });
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