import User from "../models/UserModel.js";
import OTP from "../models/AuthModels/otpModels.js";
import TokenModel from "../models/AuthModels/tokenModel.js";
import jwt from "jsonwebtoken";
import {
  sendVerificationOTP,
  sendPasswordResetOTP,
} from "../services/emailService.js";
import { UserWorkAccess } from "../models/PlatformModel/UserWorkAccessModel.js";

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || "your-secret-key",
    {
      expiresIn: "24h",
    }
  );
};

// Helper function to generate OTP code
const generateOTPCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to persist token session
const persistTokenSession = async (user, token, req) => {
  try {
    const decoded = jwt.decode(token);
    const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : undefined;
    
    // Check if user exists
    const checkUser = await User.findById(user._id);
    
    if (checkUser) {
      // Check if a token session already exists for this user
      const existingToken = await TokenModel.findOne({ 
        user: user._id, 
        isRevoked: false 
      });
      
      if (existingToken) {
        // Update existing token session
        await TokenModel.findOneAndUpdate(
          { user: user._id, isRevoked: false },
          {
            token,
            ip: req.ip || req.headers["x-forwarded-for"],
            userAgent: req.headers["user-agent"],
            expiresAt,
          },
          { new: true }
        );
      } else {
        // Create new token session
        await TokenModel.create({
          user: user._id,
          token,
          isRevoked: false,
          ip: req.ip || req.headers["x-forwarded-for"],
          userAgent: req.headers["user-agent"],
          expiresAt,
        });
      }
    } else {
      throw new Error("User not found");
    }
  } catch (err) {
    console.error("Failed to persist token session:", err);
    throw err; // Re-throw to handle in calling function
  }
};
// Helper function to create OTP record
const createOTPRecord = async (email, otpCode) => {
  // Remove any existing OTP for this email
  await OTP.deleteMany({ email });

  // Create new OTP record
  const otpRecord = new OTP({
    email,
    otp: otpCode,
    createdAt: new Date(),
  });

  return await otpRecord.save();
};

// Helper function to verify OTP
const verifyOTPRecord = async (email, otpCode) => {
  const otpRecord = await OTP.findOne({ email, otp: otpCode });

  if (!otpRecord) {
    return false;
  }

  // Check if OTP is expired (5 minutes from creation)
  const now = new Date();
  const otpAge = (now - otpRecord.createdAt) / 1000; // in seconds

  if (otpAge > 300) {
    // 5 minutes = 300 seconds
    // Delete expired OTP
    await OTP.deleteOne({ _id: otpRecord._id });
    return false;
  }

  // Delete used OTP
  await OTP.deleteOne({ _id: otpRecord._id });
  return true;
};

// User registration
// const register = async (req, res) => {
//   try {
//       const { data } = req.body;
//       if (!data) {
//         return res.status(400).json({ message: "Invalid request body" });
//       }

//       const { username, email, password, phone, firstName, lastName } = data;
//     console.log(req.body,"body for register")

//     // Check if user already exists
//     const existingUser = await User.findOne({
//       $or: [{ email },],
//     });

//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: "User with this email, username, or phone already exists",
//       });
//     }

//     // Create new user
//     const user = new User({
//       username,
//       email,
//       password,
//       phone,
//       profile: { firstName, lastName },
//     });

//     // Generate OTP for verification
//     const otpCode = generateOTPCode();

//     // Save user first
//     await user.save();

//     // Create OTP record
//     await createOTPRecord(email, otpCode);

//     // Send verification email
//     try {
//       await sendVerificationOTP(
//         email,
//         {
//           firstName,
//           username,
//           email,
//         },
//         otpCode
//       );
//     } catch (emailError) {
//       console.error("Failed to send verification email:", emailError);
//       // Continue with user creation even if email fails
//     }

//     res.status(201).json({
//       success: true,
//       message:
//         "User registered successfully. Please check your email for verification code.",
//       user: {
//         id: user._id,
//         username: user.username,
//         email: user.email,
//         phone: user.phone,
//         isVerified: user.isVerified,
//       },
//     });
//   } catch (error) {
//     console.error("Registration error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Registration failed",
//       error: error.message,
//     });
//   }
// };
const register = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ message: "Invalid request body" });
    }

    const { username, email, password, phone, firstName, lastName } = data;

    // --- Check if user already exists ---
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { phone }],
    });

    if (existingUser) {
      let field = '';
      if (existingUser.email === email) field = 'email';
      else if (existingUser.username === username) field = 'username';
      else if (existingUser.phone === phone) field = 'phone number';

      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists.`,
      });
    }

    // --- Create new user ---
    const user = new User({
      username,
      email,
      password,
      phone,
      profile: { firstName, lastName },
      isVerified: false,
    });

    await user.save();

    // --- Update pending invitations for this email ---
    await UserWorkAccess.updateMany(
      { userId: null, invitedEmail: email }, // assuming you store invited email
      { $set: { userId: user._id, status: "accepted" } } // mark as accepted
    );

    // --- Generate OTP and send verification email ---
    const otpCode = generateOTPCode();
    await createOTPRecord(email, otpCode);
    try {
      await sendVerificationOTP(
        email,
        { firstName, username, email },
        otpCode
      );
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    // --- Return response ---
    res.status(201).json({
      success: true,
      message:
        "Registration successful. Your account is created but requires verification. Please check your email for the verification code.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};


// Send OTP for login
const sendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("email", email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Generate new OTP
    const otpCode = generateOTPCode();

    // Create OTP record
    await createOTPRecord(email, otpCode);

    // Send OTP email
    try {
      await sendVerificationOTP(
        email,
        {
          email: email,
        },
        otpCode
      );
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      email: email,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
};

// Verify OTP and login
const verifyOTPAndLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // First verify the OTP regardless of user existence
    if (!(await verifyOTPRecord(email, otp))) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const user = await User.findOne({ email });

    // If user doesn't exist, send response with redirect flag
    if (!user) {
      console.log("User not found - redirecting to registration");
      return res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        requiresRegistration: true,
        email: email,
      });
    }

    // User exists - proceed with login checks
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message:
          "Account is temporarily locked due to multiple failed attempts. Please try again later.",
      });
    }

    if (!user.isActive) {
      return res.status(423).json({
        success: false,
        message: "Account is deactivated. Please contact support.",
      });
    }

    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);

    // Persist the token session
    await persistTokenSession(user, token, req);

    // User exists and login successful
    res.status(200).json({
      success: true,
      message: "Login successful",
      requiresRegistration: false,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
      error: error.message,
    });
  }
};

// Resend verification OTP
const resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found - redirecting to registration");
      // Generate new OTP
      const otpCode = generateOTPCode();
      await sendVerificationOTP(
        email,
        {
          email: email,
        },
        otpCode
      );

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        requiresRegistration: true,
        email: email,
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User is already verified",
      });
    }

    // Generate new OTP
    const otpCode = generateOTPCode();

    // Create OTP record
    await createOTPRecord(email, otpCode);

    try {
      await sendVerificationOTP(
        email,
        {
          firstName: user.profile.firstName,
          username: user.username,
          email: user.email,
        },
        otpCode
      );
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification OTP. Please try again.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Verification OTP resent successfully",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
      error: error.message,
    });
  }
};

// Verify account with OTP
const verifyAccount = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User is already verified",
      });
    }

    // Verify OTP using OTP model
    if (!(await verifyOTPRecord(email, otp))) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    user.isVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Account verified successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Account verification error:", error);
    res.status(500).json({
      success: false,
      message: "Account verification failed",
      error: error.message,
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        profile: user.profile,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, bio, avatar } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (firstName !== undefined) user.profile.firstName = firstName;
    if (lastName !== undefined) user.profile.lastName = lastName;
    if (bio !== undefined) user.profile.bio = bio;
    if (avatar !== undefined) user.profile.avatar = avatar;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message,
    });
  }
};

// Forgot password - send reset OTP
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const otpCode = generateOTPCode();
    await createOTPRecord(email, otpCode);

    try {
      await sendPasswordResetOTP(
        email,
        {
          firstName: user.profile.firstName,
          username: user.username,
          email: user.email,
        },
        otpCode
      );
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send password reset OTP. Please try again.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password reset OTP sent successfully",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process forgot password request",
      error: error.message,
    });
  }
};

// Reset password with OTP
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify OTP using OTP model
    if (!(await verifyOTPRecord(email, otp))) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

// Logout - revoke current token
const logout = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(400).json({ success: false, message: "Token required" });
    }

    const session = await TokenModel.findOneAndUpdate(
      { token },
      { $set: { isRevoked: true } },
      { new: true }
    );

    if (!session) {
      return res.status(200).json({ success: true, message: "Logged out" });
    }

    return res.status(200).json({ success: true, message: "Logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};

// Validate token
const validateToken = async (req, res) => {
  try {
    const token = req.body.token || (req.headers["authorization"] && req.headers["authorization"].split(" ")[1]);

    if (!token) {
      return res.status(400).json({ success: false, message: "Token required" });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    } catch (e) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // Ensure token is not revoked
    const session = await TokenModel.findOne({ token, isRevoked: false }).populate("user");
    if (!session) {
      return res.status(401).json({ success: false, message: "Session revoked or not found" });
    }

    const user = session.user;
    
    // Check if user is still active
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: "User account is deactivated" });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        profile: user.profile,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    console.error("Token validation error:", error);
    res.status(500).json({ success: false, message: "Token validation failed", error: error.message });
  }
};

// Fetch user details by token
const getUserByToken = async (req, res) => {
  try {
    const token = req.body.token || (req.headers["authorization"] && req.headers["authorization"].split(" ")[1]);

    if (!token) {
      return res.status(400).json({ success: false, message: "Token required" });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    } catch (e) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    // Ensure token is not revoked
    const session = await TokenModel.findOne({ token, isRevoked: false }).populate("user");
    if (!session) {
      return res.status(401).json({ success: false, message: "Session revoked or not found" });
    }

    const user = session.user;
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        profile: user.profile,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
      session: {
        token: session.token,
        isRevoked: session.isRevoked,
        ip: session.ip,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error("Get user by token error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch user", error: error.message });
  }
};

export {
  generateToken,
  register,
  sendLoginOTP,
  verifyOTPAndLogin,
  resendVerificationOTP,
  verifyAccount,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  validateToken,
  getUserByToken,
};
