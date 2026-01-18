import express from "express";
import EmailController from "../controllers/emailController.js";

const router = express.Router();

// Test email endpoint
router.get("/test", EmailController.testEmail);

// Send a simple email
router.post("/send", EmailController.sendEmail);

// Send welcome email
router.post("/welcome", EmailController.sendWelcomeEmail);

// Send ticket notification email
// router.post("/ticket-notification", EmailController.sendTicketNotification);

// Send project assignment email
// router.post("/project-assignment", EmailController.sendProjectAssignment);

// Send password reset email
router.post("/password-reset", EmailController.sendPasswordResetOTP);

// Send bulk emails
router.post("/bulk", EmailController.sendBulkEmails);

export default router;
