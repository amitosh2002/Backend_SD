// import express from "express";
// import AuthController from "../controllers/authController.js";
// import {
//   authenticateToken,
//   requireVerified,
//   otpRateLimit,
// } from "../middleware/authMiddleware.js";

// const router = express.Router();

// // Public routes (no authentication required)
// router.post("/register", AuthController.register);
// router.post("/send-login-otp", otpRateLimit, AuthController.sendLoginOTP);
// router.post("/verify-login", AuthController.verifyOTPAndLogin);
// router.post(
//   "/resend-verification",
//   otpRateLimit,
//   AuthController.resendVerificationOTP
// );
// router.post("/verify-account", AuthController.verifyAccount);
// router.post("/forgot-password", otpRateLimit, AuthController.forgotPassword);
// router.post("/reset-password", AuthController.resetPassword);

// // Protected routes (authentication required)
// router.get("/profile", authenticateToken, AuthController.getProfile);
// router.put(
//   "/profile",
//   authenticateToken,
//   requireVerified,
//   AuthController.updateProfile
// );
// router.put(
//   "/change-password",
//   authenticateToken,
//   requireVerified,
//   AuthController.changePassword
// );
// router.post("/logout", authenticateToken, AuthController.logout);

// export default router;

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
