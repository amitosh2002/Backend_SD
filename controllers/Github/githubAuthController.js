import { getGithubAuthUrl, exchangeCodeForToken, handleInstallationRepoChange, handleInstallationEvent, handlePushEvent, handlePullRequestEvent } from "../../config/GithubConfigs/githubUtility.js";
import { GithubConfigModel } from "../../models/PlatformModel/GithubConfigModel.js";
import { encrypt } from "../../utility/securityUtility.js";

/**
 * Redirect the user to GitHub for authorization
 */
export const redirectToGithub = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ success: false, message: "projectId is required" });
    }
    const authUrl = getGithubAuthUrl(projectId);
    res.redirect(authUrl);
  } catch (error) {
    console.error("redirectToGithub error:", error);
    res.status(500).json({ success: false, message: "Failed to initiate GitHub auth" });
  }
};

/**
 * Handle the callback from GitHub after user authorization
 */
export const handleGithubCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).json({ success: false, message: "Authorization code missing" });
    }

    // Decode state to get projectId
    const decodedState = JSON.parse(decodeURIComponent(state));
    const { projectId } = decodedState;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "ProjectId missing in state" });
    }

    // Exchange code for token
    const accessToken = await exchangeCodeForToken(code);

    // Store token in GithubConfigModel (encrypted)
    const projectConfig = await GithubConfigModel.findOneAndUpdate(
      { projectId },
      {
        githubSecretCode: encrypt(accessToken),
        updatedBy: req.user?.id || 'SYSTEM', // req.user might not be available if this is a public redirect
        isActive: true
      },
      { upsert: true, new: true }
    );

    // Redirect or respond with success
    // In a real app, you might want to redirect back to the frontend
    res.status(200).json({
      success: true,
      message: "GitHub account linked successfully",
      projectId: projectConfig.projectId
    });
  } catch (error) {
    console.error("handleGithubCallback error:", error);
    res.status(500).json({ success: false, message: "Failed to handle GitHub callback", error: error.message });
  }
};

// setup controller 
export const setupInstallationGithub = async(req,res)=>{


  try {
    const userId= req.user.userId
    const { installation_id } = req.query;

  await GithubInstallationModel.create({
    userId: userId,
    installationId: Number(installation_id),
    provider: 'github'
  });

 res.redirect(`${process.env.FRONTEND_URL}/test`);
    
  } catch (error) {
    
  }

}

// webhook controller 

export const webhookHandler =async (req, res) => {
  try {
    // 1️⃣ Verify signature
    if (!verifyGithubSignature(req)) {
      return res.status(401).send('Invalid signature');
    }

    // 2️⃣ Read event
    const event = req.headers['x-github-event'];
    const payload = JSON.parse(req.body.toString());

    // 3️⃣ Route events
    switch (event) {
      case 'installation':
        await handleInstallationEvent(payload);
        break;

      case 'installation_repositories':
        await handleInstallationRepoChange(payload);
        break;

      case 'pull_request':
        await handlePullRequestEvent(payload);
        break;

      case 'push':
        await handlePushEvent(payload);
        break;

      default:
        console.log(`Unhandled GitHub event: ${event}`);
    }

    // 4️⃣ ACK GitHub immediately
    res.status(200).send('OK');
  } catch (err) {
    console.error('GitHub Webhook Error:', err);
    res.status(500).send('Webhook processing failed');
  }
}