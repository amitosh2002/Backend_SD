// import {
//   sendBulkEmails,
//   sendEmail,
//   sendPasswordReset,
//   sendProjectAssignment,
//   sendTicketNotification,
//   sendWelcomeEmail,
// } from "../services/emailService.js";

// class EmailController {
//   // Send a simple email
//   static async sendEmail(req, res) {
//     try {
//       const { to, subject, text, html } = req.body;

//       // Validate required fields
//       if (!to || !subject || (!text && !html)) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Missing required fields: to, subject, and either text or html are required",
//         });
//       }

//       const result = await sendEmail(to, subject, text, html);

//       if (result.success) {
//         res.status(200).json({
//           success: true,
//           message: "Email sent successfully",
//           messageId: result.messageId,
//         });
//       } else {
//         res.status(500).json({
//           success: false,
//           message: "Failed to send email",
//           error: result.error,
//         });
//       }
//     } catch (error) {
//       console.error("Error in sendEmail controller:", error);
//       res.status(500).json({
//         success: false,
//         message: "Internal server error",
//         error: error.message,
//       });
//     }
//   }

//   // Send welcome email
//   static async sendWelcomeEmail(req, res) {
//     try {
//       const { to, username } = req.body;

//       if (!to || !username) {
//         return res.status(400).json({
//           success: false,
//           message: "Missing required fields: to and username are required",
//         });
//       }

//       const result = await sendWelcomeEmail(to, username);

//       if (result.success) {
//         res.status(200).json({
//           success: true,
//           message: "Welcome email sent successfully",
//           messageId: result.messageId,
//         });
//       } else {
//         res.status(500).json({
//           success: false,
//           message: "Failed to send welcome email",
//           error: result.error,
//         });
//       }
//     } catch (error) {
//       console.error("Error in sendWelcomeEmail controller:", error);
//       res.status(500).json({
//         success: false,
//         message: "Internal server error",
//         error: error.message,
//       });
//     }
//   }

//   // Send ticket notification email
//   static async sendTicketNotification(req, res) {
//     try {
//       const { to, ticketId, ticketTitle, status } = req.body;

//       if (!to || !ticketId || !ticketTitle || !status) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Missing required fields: to, ticketId, ticketTitle, and status are required",
//         });
//       }

//       const result = await sendTicketNotification(
//         to,
//         ticketId,
//         ticketTitle,
//         status
//       );

//       if (result.success) {
//         res.status(200).json({
//           success: true,
//           message: "Ticket notification email sent successfully",
//           messageId: result.messageId,
//         });
//       } else {
//         res.status(500).json({
//           success: false,
//           message: "Failed to send ticket notification email",
//           error: result.error,
//         });
//       }
//     } catch (error) {
//       console.error("Error in sendTicketNotification controller:", error);
//       res.status(500).json({
//         success: false,
//         message: "Internal server error",
//         error: error.message,
//       });
//     }
//   }

//   // Send project assignment email
//   static async sendProjectAssignment(req, res) {
//     try {
//       const { to, projectName, role } = req.body;

//       if (!to || !projectName || !role) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Missing required fields: to, projectName, and role are required",
//         });
//       }

//       const result = await sendProjectAssignment(to, projectName, role);

//       if (result.success) {
//         res.status(200).json({
//           success: true,
//           message: "Project assignment email sent successfully",
//           messageId: result.messageId,
//         });
//       } else {
//         res.status(500).json({
//           success: false,
//           message: "Failed to send project assignment email",
//           error: result.error,
//         });
//       }
//     } catch (error) {
//       console.error("Error in sendProjectAssignment controller:", error);
//       res.status(500).json({
//         success: false,
//         message: "Internal server error",
//         error: error.message,
//       });
//     }
//   }

//   // Send password reset email
//   static async sendPasswordReset(req, res) {
//     try {
//       const { to, resetToken } = req.body;

//       if (!to || !resetToken) {
//         return res.status(400).json({
//           success: false,
//           message: "Missing required fields: to and resetToken are required",
//         });
//       }

//       const result = await sendPasswordReset(to, resetToken);

//       if (result.success) {
//         res.status(200).json({
//           success: true,
//           message: "Password reset email sent successfully",
//           messageId: result.messageId,
//         });
//       } else {
//         res.status(500).json({
//           success: false,
//           message: "Failed to send password reset email",
//           error: result.error,
//         });
//       }
//     } catch (error) {
//       console.error("Error in sendPasswordReset controller:", error);
//       res.status(500).json({
//         success: false,
//         message: "Internal server error",
//         error: error.message,
//       });
//     }
//   }

//   // Send bulk emails
//   static async sendBulkEmails(req, res) {
//     try {
//       const { recipients, subject, text, html } = req.body;

//       if (
//         !recipients ||
//         !Array.isArray(recipients) ||
//         recipients.length === 0 ||
//         !subject ||
//         (!text && !html)
//       ) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Missing required fields: recipients (array), subject, and either text or html are required",
//         });
//       }

//       const result = await sendBulkEmails(recipients, subject, text, html);

//       if (result.success) {
//         res.status(200).json({
//           success: true,
//           message: "Bulk emails sent successfully",
//           results: result.results,
//         });
//       } else {
//         res.status(500).json({
//           success: false,
//           message: "Failed to send bulk emails",
//           error: result.error,
//         });
//       }
//     } catch (error) {
//       console.error("Error in sendBulkEmails controller:", error);
//       res.status(500).json({
//         success: false,
//         message: "Internal server error",
//         error: error.message,
//       });
//     }
//   }


//   // Test email endpoint
//   static async testEmail(req, res) {
//     try {
//       const testEmail = process.env.TEST_EMAIL || "test@example.com";
//       const result = await sendEmail(
//         testEmail,
//         "Test Email from Backend",
//         "This is a test email to verify the email service is working.",
//         "<h2>Test Email</h2><p>This is a test email to verify the email service is working.</p>"
//       );

//       if (result.success) {
//         res.status(200).json({
//           success: true,
//           message: "Test email sent successfully",
//           messageId: result.messageId,
//         });
//       } else {
//         res.status(500).json({
//           success: false,
//           message: "Failed to send test email",
//           error: result.error,
//         });
//       }
//     } catch (error) {
//       console.error("Error in testEmail controller:", error);
//       res.status(500).json({
//         success: false,
//         message: "Internal server error",
//         error: error.message,
//       });
//     }
//   }
// }

// export default EmailController;
import {
  sendEmail,
  sendWelcomeEmail,
  sendInvitationEmail,
  sendPasswordResetOTP,
  sendVerificationOTP,
  sendTicketStatusUpdate,
  sendBulkEmails,
} from "../services/emailService.js";

class EmailController {
  /* ------------------ Send Custom Email ------------------ */
  static async sendEmail(req, res) {
    try {
      const { to, subject, text, html } = req.body;

      if (!to || !subject || (!text && !html)) {
        return res.status(400).json({
          success: false,
          message: "to, subject and text/html are required",
        });
      }

      const result = await sendEmail(to, subject, text, html);

      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error("sendEmail error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /* ------------------ Welcome Email ------------------ */
  static async sendWelcomeEmail(req, res) {
    try {
      const { to, user } = req.body;

      if (!to || !user) {
        return res.status(400).json({
          success: false,
          message: "to and user object required",
        });
      }

      const result = await sendWelcomeEmail(to, user);
      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error("sendWelcomeEmail error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /* ------------------ Invitation Email ------------------ */
  static async sendInvitationEmail(req, res) {
    try {
      const result = await sendInvitationEmail(req.body);
      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error("sendInvitationEmail error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /* ------------------ Password Reset OTP ------------------ */
  static async sendPasswordResetOTP(req, res) {
    try {
      const { to, user, otp } = req.body;

      if (!to || !user || !otp) {
        return res.status(400).json({
          success: false,
          message: "to, user, otp required",
        });
      }

      const result = await sendPasswordResetOTP(to, user, otp);
      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error("sendPasswordResetOTP error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /* ------------------ Verification OTP ------------------ */
  static async sendVerificationOTP(req, res) {
    try {
      const { to, user, otp } = req.body;

      if (!to || !user || !otp) {
        return res.status(400).json({
          success: false,
          message: "to, user, otp required",
        });
      }

      const result = await sendVerificationOTP(to, user, otp);
      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error("sendVerificationOTP error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /* ------------------ Ticket Status Update ------------------ */
  static async sendTicketStatusUpdate(req, res) {
    try {
      const { to, ticket } = req.body;

      if (!to || !ticket) {
        return res.status(400).json({
          success: false,
          message: "to and ticket object required",
        });
      }

      const result = await sendTicketStatusUpdate(to, ticket);
      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error("sendTicketStatusUpdate error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /* ------------------ Bulk Emails ------------------ */
  static async sendBulkEmails(req, res) {
    try {
      const { recipients, subject, text, html } = req.body;

      if (!recipients || !subject || (!text && !html)) {
        return res.status(400).json({
          success: false,
          message: "recipients, subject and text/html required",
        });
      }

      const result = await sendBulkEmails(recipients, subject, text, html);
      res.status(200).json({ success: true, results: result });
    } catch (error) {
      console.error("sendBulkEmails error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /* ------------------ Test Email ------------------ */
  static async testEmail(req, res) {
    try {
      const email = process.env.TEST_EMAIL;

      const result = await sendEmail(
        email,
        "Hora Test Email",
        "Email system working",
        "<h2>Hora Email System OK ✅</h2>"
      );

      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error("testEmail error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default EmailController;
