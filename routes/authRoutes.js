import express from "express";
import {
  register,
  sendLoginOTP,
  verifyOTPAndLogin,
  resendVerificationOTP,
  verifyAccount,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  validateToken,
  getUserByToken,
} from "../controllers/authController.js";
import {
  authenticateToken,
  requireVerified,
  otpRateLimit,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes (no authentication required)
router.post("/register", register);
router.post("/send-login-otp", otpRateLimit, sendLoginOTP);
router.post("/verify-login", verifyOTPAndLogin);
router.post("/resend-verification", otpRateLimit, resendVerificationOTP);
router.post("/verify-account", verifyAccount);
router.post("/forgot-password", otpRateLimit, forgotPassword);
router.post("/reset-password", resetPassword);

// Token validation route
router.post("/validate-token", validateToken);

// Fetch user by token (can be used by services); accepts token in param or header
router.post("/session/getUser", authenticateToken, getUserByToken);

// Protected routes (authentication required)
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, requireVerified, updateProfile);
router.put(
  "/change-password",
  authenticateToken,
  requireVerified,
  changePassword
);
router.post("/logout", authenticateToken, logout);

export default router;
