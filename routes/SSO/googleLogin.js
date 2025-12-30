import express from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import User from "../../models/UserModel.js";  // <-- fix path + .js
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import { generateToken, persistTokenSession } from "../../controllers/authController.js";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google-login", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Google token missing",
      });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    // Find user
    let user = await User.findOne({ email });

    // Auto-register if not found
    if (!user) {
      user = await User.create({
        username: name,
        email,
        googleId: payload.sub,
        isVerified: true,
        isActive: true,
        profile: {
          firstName: name.split(" ")[0],
          lastName: name.split(" ")[1] || "",
          avatar: picture,
        },
      });

      // Attach pending invitations
      await UserWorkAccess.updateMany(
        { userId: null, invitedEmail: email },
        { $set: { userId: user._id, status: "accepted" } }
      );
    }

    // ❗ Account checks (same as your OTP login)
    if (user.isLocked && user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: "Account locked due to failed attempts",
      });
    }

    if (!user.isActive) {
      return res.status(423).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create App Auth Token (same as OTP flow)
    const appToken = generateToken(user._id, user.role);

    // Store token session (CRITICAL!)
    await persistTokenSession(user, appToken, req);

    // Final response (consistent with OTP login)
    return res.status(200).json({
      success: true,
      message: "Google login successful",
      requiresRegistration: false,
      token: appToken,
      // user: {
      //   id: user._id,
      //   username: user.username,
      //   email: user.email,
      //   phone: user.phone,
      //   role: user.role,
      //   isVerified: user.isVerified,
      //   profile: user.profile,
      // },
    });

  } catch (err) {
    console.error("Google Login Error:", err);
    return res.status(500).json({
      success: false,
      message: "Google login failed",
      error: err.message,
    });
  }
});

export default router;
