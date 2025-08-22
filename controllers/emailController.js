import {
  sendBulkEmails,
  sendEmail,
  sendPasswordReset,
  sendProjectAssignment,
  sendTicketNotification,
  sendWelcomeEmail,
} from "../services/emailService.js";

class EmailController {
  // Send a simple email
  static async sendEmail(req, res) {
    try {
      const { to, subject, text, html } = req.body;

      // Validate required fields
      if (!to || !subject || (!text && !html)) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: to, subject, and either text or html are required",
        });
      }

      const result = await sendEmail(to, subject, text, html);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Email sent successfully",
          messageId: result.messageId,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send email",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error in sendEmail controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Send welcome email
  static async sendWelcomeEmail(req, res) {
    try {
      const { to, username } = req.body;

      if (!to || !username) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: to and username are required",
        });
      }

      const result = await sendWelcomeEmail(to, username);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Welcome email sent successfully",
          messageId: result.messageId,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send welcome email",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error in sendWelcomeEmail controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Send ticket notification email
  static async sendTicketNotification(req, res) {
    try {
      const { to, ticketId, ticketTitle, status } = req.body;

      if (!to || !ticketId || !ticketTitle || !status) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: to, ticketId, ticketTitle, and status are required",
        });
      }

      const result = await sendTicketNotification(
        to,
        ticketId,
        ticketTitle,
        status
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Ticket notification email sent successfully",
          messageId: result.messageId,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send ticket notification email",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error in sendTicketNotification controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Send project assignment email
  static async sendProjectAssignment(req, res) {
    try {
      const { to, projectName, role } = req.body;

      if (!to || !projectName || !role) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: to, projectName, and role are required",
        });
      }

      const result = await sendProjectAssignment(to, projectName, role);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Project assignment email sent successfully",
          messageId: result.messageId,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send project assignment email",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error in sendProjectAssignment controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Send password reset email
  static async sendPasswordReset(req, res) {
    try {
      const { to, resetToken } = req.body;

      if (!to || !resetToken) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: to and resetToken are required",
        });
      }

      const result = await sendPasswordReset(to, resetToken);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Password reset email sent successfully",
          messageId: result.messageId,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send password reset email",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error in sendPasswordReset controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Send bulk emails
  static async sendBulkEmails(req, res) {
    try {
      const { recipients, subject, text, html } = req.body;

      if (
        !recipients ||
        !Array.isArray(recipients) ||
        recipients.length === 0 ||
        !subject ||
        (!text && !html)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: recipients (array), subject, and either text or html are required",
        });
      }

      const result = await sendBulkEmails(recipients, subject, text, html);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Bulk emails sent successfully",
          results: result.results,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send bulk emails",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error in sendBulkEmails controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Test email endpoint
  static async testEmail(req, res) {
    try {
      const testEmail = process.env.TEST_EMAIL || "test@example.com";
      const result = await sendEmail(
        testEmail,
        "Test Email from Backend",
        "This is a test email to verify the email service is working.",
        "<h2>Test Email</h2><p>This is a test email to verify the email service is working.</p>"
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Test email sent successfully",
          messageId: result.messageId,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send test email",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error in testEmail controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

export default EmailController;
