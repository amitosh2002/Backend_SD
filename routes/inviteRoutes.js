import express from "express";
import crypto from "crypto";
import InviteSchema from "../models/PlatformModel/inviteModel.js";

const router = express.Router();

// Create an invitation
router.post("/create", async (req, res) => {
  try {
    const { projectId, inviterId, inviteeEmail, role } = req.body;

    const invitationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await InviteSchema.create({
      projectId,
      inviterId,
      inviteeEmail,
      role,
      invitationToken,
      expiresAt
    });

    // TODO: send email with token link
    // Example: https://yourapp.com/accept-invite?token=invitationToken

    res.status(201).json({ message: "Invite created", invite });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Accept invitation
router.post("/accept", async (req, res) => {
  try {
    const { token } = req.body;

    const invite = await InviteSchema.findOne({ invitationToken: token });

    if (!invite) return res.status(404).json({ message: "Invalid token" });
    if (invite.status !== "Pending") return res.status(400).json({ message: "Invite already used" });
    if (invite.expiresAt < new Date()) return res.status(400).json({ message: "Invite expired" });

    invite.status = "Accepted";
    await invite.save();

    // TODO: add user to project

    res.json({ message: "Invitation accepted", invite });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
