import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Static PAT for now
});

// List repos of authenticated user
export const listRepos = async (req, res) => {
  try {
    const { data } = await octokit.repos.listForAuthenticatedUser();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new repo
export const createRepo = async (req, res) => {
  try {
    const { name, privateRepo } = req.body;
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name,
      private: privateRepo ?? false,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// List branches of a repo
export const listBranches = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { data } = await octokit.repos.listBranches({ owner, repo });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a branch (by referencing another branch SHA)
export const createBranch = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { newBranchName, fromBranch } = req.body;

    // 1. Get the reference SHA of the branch to copy
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });

    const sha = refData.object.sha;

    // 2. Create a new ref
    const { data } = await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranchName}`,
      sha,
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
