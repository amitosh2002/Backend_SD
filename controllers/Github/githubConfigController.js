import { GithubConfigModel } from "../../models/PlatformModel/GithubConfigModel.js";
import { encrypt } from "../../utility/securityUtility.js";

export const saveGithubConfig = async (req, res) => {
    try {
        const { projectId, githubSecretCode } = req.body;
        if (!projectId || !githubSecretCode) {
            return res.status(400).json({ success: false, message: "Project ID and Token are required" });
        }

        const projectConfig = await GithubConfigModel.findOneAndUpdate(
            { projectId },
            {
                githubSecretCode: encrypt(githubSecretCode),
                updatedBy: req.user?.id
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, message: "GitHub Configuration saved", config: projectConfig });
    } catch (error) {
        console.error("saveGithubConfig error:", error);
        res.status(500).json({ success: false, message: "Failed to save GitHub Configuration", error: error.message });
    }
};

export const getGithubConfig = async (req, res) => {
    try {
        const { projectId } = req.params;
        const config = await GithubConfigModel.findOne({ projectId });
        if (config) {
            config.githubSecretCode = '********'; // Mask for UI
        }
        res.status(200).json({ success: true, config });
    } catch (error) {
        console.error("getGithubConfig error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch GitHub Configuration", error: error.message });
    }
};
