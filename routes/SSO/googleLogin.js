import express from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import User from "../../models/UserModel.js";  // <-- fix path + .js
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";

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

        console.log("first sso user creation  ")


    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    // 🔍 Check if user already exists (Mongoose)
    let user = await User.findOne({ email });

    // 🆕 Auto-register new Google user
    if (!user) {
        console.log("first sso user creation if ")
      user = await User.create({
        username: name,
        email,
        googleId: payload.sub,
        profile: {
          firstName: name.split(" ")[0],
          lastName: name.split(" ")[1] || "",
          avatar: picture,
        },
        isVerified: true,
        isActive:true,
      });

          // --- Update pending invitations for this email ---
          await UserWorkAccess.updateMany(
            { userId: null, invitedEmail: email }, // assuming you store invited email
            { $set: { userId: user._id, status: "accepted" } } // mark as accepted
          );
      
    }



    // 🔑 Sign JWT
    const appToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
        console.log("first sso user creation end ")


    return res.json({
      success: true,
      token: appToken,
      user,
    });

  } catch (err) {
    console.error("Google Login Error:", err);
    return res.status(500).json({
      success: false,
      message: "Google login failed",
    });
  }
});

export default router;
