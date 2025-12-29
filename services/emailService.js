import { transporter, resendTransporter } from "../config/emailConfig.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper method to compile and render Handlebars templates
const compileTemplate = (templateName, data) => {
  try {
    const templatePath = path.join(
      __dirname,
      "../Templates",
      `${templateName}.handlebars`
    );
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = Handlebars.compile(templateSource);
    return template(data);
  } catch (error) {
    console.error(`Error compiling template ${templateName}:`, error);
    throw new Error(`Template compilation failed: ${error.message}`);
  }
};

// Helper method to get status colors
const getStatusColor = (status) => {
  const colors = {
    open: { bg: "#e53e3e", text: "white" },
    in_progress: { bg: "#3182ce", text: "white" },
    resolved: { bg: "#38a169", text: "white" },
    closed: { bg: "#718096", text: "white" },
    pending: { bg: "#d69e2e", text: "white" },
  };
  return colors[status.toLowerCase()] || { bg: "#718096", text: "white" };
};

// Send a simple email
const sendEmail = async (to, subject, text, html) => {
  try {
    const region = process.env.SMTP_REGION || "NOT_SET";
    console.log(`[sendEmail] Starting email send process. Region: ${region}, To: ${to}`);

    if (process.env.SMTP_REGION === "PROD") {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const fromName = "Hora";
      const formattedFrom = fromEmail.includes("<") ? fromEmail : `${fromName} <${fromEmail}>`;

      console.log(`[PROD] Attempting to send via Resend SMTP from: ${formattedFrom}`);

      const mailOptions = {
        from: formattedFrom,
        to: to,
        subject: subject,
        text: text,
        html: html,
      };

      const result = await resendTransporter.sendMail(mailOptions);
      console.log("[PROD] Email sent successfully via Resend SMTP:", result.messageId);
      return { success: true, messageId: result.messageId };
    } else {
      // Use Nodemailer (Gmail) for STAGE or default
      const mode = process.env.SMTP_REGION === "STAGE" ? "STAGE" : "DEFAULT/LOCAL";
      console.log(`[${mode}] Attempting to send via Nodemailer (Gmail)...`);
      console.log(`[${mode}] Using EMAIL_USER: ${process.env.EMAIL_USER}`);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        text: text,
        html: html,
      };

      console.log(`[${mode}] Calling transporter.sendMail...`);
      const result = await transporter.sendMail(mailOptions);
      console.log(`[${mode}] Email sent successfully via Nodemailer (Gmail):`, result.messageId);
      return { success: true, messageId: result.messageId };
    }
  } catch (error) {
    console.error("[sendEmail] CRITICAL ERROR:", error);
    return { success: false, error: error.message };
  }
};

// Send welcome email using Handlebars template
const sendWelcomeEmail = async (to, userData) => {
  const subject = "Welcome to Our Platform!";
  const text = `Hello ${
    userData.firstName || userData.username
  }, welcome to our platform!`;

  const templateData = {
    user_name: userData.firstName || userData.username,
    user_email: userData.email,
    app_url: process.env.FRONTEND_URL || "https://hora.com",
    help_url: `${process.env.FRONTEND_URL}/help`,
    contact_url: `${process.env.FRONTEND_URL}/contact`,
    privacy_url: `${process.env.FRONTEND_URL}/privacy`,
    twitter_url: "https://twitter.com/hora",
    linkedin_url: "https://linkedin.com/company/hora",
    github_url: "https://github.com/hora",
    company_address: "123 Time Street, Productivity City, PC 12345",
  };

  try {
    const html = compileTemplate("ticketStatus", templateData);
    return await sendEmail(to, subject, text, html);
  } catch (error) {
    console.error("Template compilation failed:", error);
    const fallbackHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Our Platform!</h2>
          <p>Hello ${userData.firstName || userData.username},</p>
          <p>Thank you for joining our platform. We're excited to have you on board!</p>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <br>
          <p>Best regards,<br>The Team</p>
        </div>
      `;
    return await sendEmail(to, subject, text, fallbackHtml);
  }
};

// Send ticket notification email using Handlebars template
const sendTicketNotification = async (
  to,
  ticketId,
  ticketTitle,
  status,
  userData
) => {
  const subject = `Ticket Update: ${ticketTitle}`;
  const text = `Your ticket ${ticketId} has been updated to status: ${status}`;

  const templateData = {
    user_name: userData?.firstName || userData?.username || "User",
    user_email: userData?.email,
    ticket_id: ticketId,
    ticket_title: ticketTitle,
    ticket_status: status,
    status_bg_color: getStatusColor(status).bg,
    status_text_color: getStatusColor(status).text,
    app_url: process.env.FRONTEND_URL || "https://hora.com",
    help_url: `${process.env.FRONTEND_URL}/help`,
    contact_url: `${process.env.FRONTEND_URL}/contact`,
    privacy_url: `${process.env.FRONTEND_URL}/privacy`,
    twitter_url: "https://twitter.com/hora",
    linkedin_url: "https://linkedin.com/company/hora",
    github_url: "https://github.com/hora",
    company_address: "123 Time Street, Productivity City, PC 12345",
  };

  try {
    const html = compileTemplate("ticketStatus", templateData);
    return await sendEmail(to, subject, text, html);
  } catch (error) {
    console.error("Template compilation failed:", error);
    const fallbackHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Ticket Update</h2>
          <p>Your ticket has been updated:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Ticket ID:</strong> ${ticketId}</p>
            <p><strong>Title:</strong> ${ticketTitle}</p>
            <p><strong>Status:</strong> <span style="color: #007bff;">${status}</span></p>
          </div>
          <p>Please check your dashboard for more details.</p>
          <br>
          <p>Best regards,<br>Support Team</p>
        </div>
      `;
    return await sendEmail(to, subject, text, fallbackHtml);
  }
};

// Send project assignment email using Handlebars template
const sendProjectAssignment = async (to, projectName, role, userData) => {
  const subject = `Project Assignment: ${projectName}`;
  const text = `You have been assigned to project ${projectName} with role: ${role}`;

  const templateData = {
    user_name: userData?.firstName || userData?.username || "User",
    user_email: userData?.email,
    project_name: projectName,
    project_role: role,
    app_url: process.env.FRONTEND_URL || "https://hora.com",
    help_url: `${process.env.FRONTEND_URL}/help`,
    contact_url: `${process.env.FRONTEND_URL}/contact`,
    privacy_url: `${process.env.FRONTEND_URL}/privacy`,
    twitter_url: "https://twitter.com/hora",
    linkedin_url: "https://linkedin.com/company/hora",
    github_url: "https://github.com/hora",
    company_address: "123 Time Street, Productivity City, PC 12345",
  };

  try {
    const html = compileTemplate("AllTemplate", templateData);
    return await sendEmail(to, subject, text, html);
  } catch (error) {
    console.error("Template compilation failed:", error);
    const fallbackHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Project Assignment</h2>
          <p>You have been assigned to a new project:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Project:</strong> ${projectName}</p>
            <p><strong>Role:</strong> <span style="color: #28a745;">${role}</span></p>
          </div>
          <p>Please check your project dashboard for more details and start contributing!</p>
          <br>
          <p>Best regards,<br>Project Management Team</p>
        </div>
      `;
    return await sendEmail(to, subject, text, fallbackHtml);
  }
};

// Send password reset email using Handlebars template
const sendPasswordReset = async (to, resetToken, userData) => {
  const subject = "Password Reset Request";
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const text = `Click this link to reset your password: ${resetLink}`;

  const templateData = {
    user_name: userData?.firstName || userData?.username || "User",
    user_email: userData?.email,
    reset_link: resetLink,
    app_url: process.env.FRONTEND_URL || "https://hora.com",
    help_url: `${process.env.FRONTEND_URL}/help`,
    contact_url: `${process.env.FRONTEND_URL}/contact`,
    privacy_url: `${process.env.FRONTEND_URL}/privacy`,
    twitter_url: "https://twitter.com/hora",
    linkedin_url: "https://linkedin.com/company/hora",
    github_url: "https://github.com/hora",
    company_address: "123 Time Street, Productivity City, PC 12345",
  };

  try {
    const html = compileTemplate("resetPassword", templateData);
    return await sendEmail(to, subject, text, html);
  } catch (error) {
    console.error("Template compilation failed:", error);
    const fallbackHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested a password reset for your account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
          <p><strong>Note:</strong> This link will expire in 1 hour.</p>
          <br>
          <p>If you didn't request this reset, please ignore this email.</p>
          <p>Best regards,<br>Security Team</p>
        </div>
      `;
    return await sendEmail(to, subject, text, fallbackHtml);
  }
};

// Send password reset OTP using Handlebars template
const sendPasswordResetOTP = async (to, userData, otpCode) => {
  const subject = "Password Reset OTP - Hora";

  const templateData = {
    user_name: userData.firstName || userData.username,
    otp_code: otpCode,
    expiry_time: "10 minutes",
    reset_url: `${
      process.env.FRONTEND_URL
    }/reset-password?email=${encodeURIComponent(
      userData.email
    )}&otp=${otpCode}`,
    user_email: userData.email,
    support_email: process.env.SUPPORT_EMAIL || "support@hora.com",
    app_url: process.env.FRONTEND_URL || "https://hora.com",
    help_url: `${process.env.FRONTEND_URL}/help`,
    contact_url: `${process.env.FRONTEND_URL}/contact`,
    privacy_url: `${process.env.FRONTEND_URL}/privacy`,
    twitter_url: "https://twitter.com/hora",
    linkedin_url: "https://linkedin.com/company/hora",
    github_url: "https://github.com/hora",
    company_address: "123 Time Street, Productivity City, PC 12345",
  };

  try {
    const html = compileTemplate("resetPasswordOTP", templateData);
    const text = `Your password reset OTP is: ${otpCode}. This code will expire in 10 minutes.`;

    return await sendEmail(to, subject, text, html);
  } catch (error) {
    console.error("Error sending password reset OTP:", error);
    const fallbackHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset OTP</h2>
          <p>Hello ${userData.firstName || userData.username},</p>
          <p>Your password reset code is: <strong>${otpCode}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p>Best regards,<br>The Hora Team</p>
        </div>
    `;
    return await sendEmail(to, subject, text, fallbackHtml);
  }
};

// Send verification OTP using Handlebars template
const sendVerificationOTP = async (to, userData, otpCode) => {
  const subject = "Account Verification - Hora";

  const templateData = {
    // user_name: userData.firstName || userData.username,
    otp_code: otpCode,
    expiry_time: "10 minutes",
    verification_url: `${
      process.env.FRONTEND_URL
    }/verify-account?email=${encodeURIComponent(
      userData.email
    )}&otp=${otpCode}`,
    user_email: userData.email,
    support_email: process.env.SUPPORT_EMAIL || "support@hora.com",
    app_url: process.env.FRONTEND_URL || "https://hora.com",
    help_url: `${process.env.FRONTEND_URL}/help`,
    contact_url: `${process.env.FRONTEND_URL}/contact`,
    privacy_url: `${process.env.FRONTEND_URL}/privacy`,
    twitter_url: "https://twitter.com/hora",
    linkedin_url: "https://linkedin.com/company/hora",
    github_url: "https://github.com/hora",
    company_address: "123 Time Street, Productivity City, PC 12345",
  };

  try {
    const html = compileTemplate("otpTemplate", templateData);
    const text = `Your verification OTP is: ${otpCode}. This code will expire in 10 minutes.`;

    return await sendEmail(to, subject, text, html);
  } catch (error) {
    console.error("Error sending verification OTP:", error);
    const fallbackHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Account Verification</h2>
          <p>Hello ${userData.firstName || userData.username},</p>
          <p>Your verification code is: <strong>${otpCode}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p>Best regards,<br>The Hora Team</p>
        </div>
    `;
    return await sendEmail(to, subject, text, fallbackHtml);
  }
};

// Send ticket status update using Handlebars template
const sendTicketStatusUpdate = async (to, ticketData) => {
  const subject = `Ticket Status Update: ${ticketData.subject}`;

  const templateData = {
    user_name: ticketData.userName,
    user_email: ticketData.userEmail,
    ticket_id: ticketData.id,
    ticket_subject: ticketData.subject,
    ticket_status: ticketData.status,
    status_bg_color: getStatusColor(ticketData.status).bg,
    status_text_color: getStatusColor(ticketData.status).text,
    ticket_priority: ticketData.priority,
    last_updated: new Date(ticketData.updatedAt).toLocaleString(),
    assigned_to: ticketData.assignedTo || "Unassigned",
    latest_comment: ticketData.latestComment || "Status updated",
    commenter_name: ticketData.commenterName || "System",
    comment_time: new Date().toLocaleString(),
    ticket_url: `${process.env.FRONTEND_URL}/tickets/${ticketData.id}`,
    app_url: process.env.FRONTEND_URL || "https://hora.com",
    help_url: `${process.env.FRONTEND_URL}/help`,
    contact_url: `${process.env.FRONTEND_URL}/contact`,
    privacy_url: `${process.env.FRONTEND_URL}/privacy`,
    twitter_url: "https://twitter.com/hora",
    linkedin_url: "https://linkedin.com/company/hora",
    github_url: "https://github.com/hora",
    company_address: "123 Time Street, Productivity City, PC 12345",
  };

  try {
    const html = compileTemplate("ticketStatus", templateData);
    const text = `Your ticket ${ticketData.id} has been updated to status: ${ticketData.status}`;

    return await sendEmail(to, subject, text, html);
  } catch (error) {
    console.error("Error sending ticket status update:", error);
    return await sendTicketNotification(
      to,
      ticketData.id,
      ticketData.subject,
      ticketData.status,
      { firstName: ticketData.userName, email: ticketData.userEmail }
    );
  }
};

// Send bulk emails
const sendBulkEmails = async (recipients, subject, text, html) => {
  try {
    const results = [];

    for (const recipient of recipients) {
      const result = await sendEmail(recipient, subject, text, html);
      results.push({ recipient, result });
    }

    return { success: true, results };
  } catch (error) {
    console.error("Error sending bulk emails:", error);
    return { success: false, error: error.message };
  }
};

  const   sendInvitationEmail=async(templateData)=>{
    try{
    console.log("[sendInvitationEmail] Starting with templateData:", JSON.stringify(templateData, null, 2));
    
    // Compile the template and verify the output
    const html = compileTemplate("invitationTemplate", templateData);
    console.log("[sendInvitationEmail] Template compiled. Preview:", html.substring(0, 100));
    const subject=`Invitation to join ${templateData.partnerName} on Hora`;

      if(!templateData){
       throw new Error("Invalid template data for invitation email");
      }
      // Send both a plain text version and HTML version
      const plainText = templateData.invitationLink;
      console.log("[sendInvitationEmail] Calling sendEmail to:", templateData.to);
      const result = await sendEmail(templateData.to, subject, plainText, html);
      console.log("[sendInvitationEmail] sendEmail result:", result);
      return result;
      
    }catch(error){
      console.error("[sendInvitationEmail] ERROR:", error);
      return { success: false, error: error.message };
    }
  }
// Export all functions as named exports
export {
  sendEmail,
  sendWelcomeEmail,
  sendTicketNotification,
  sendProjectAssignment,
  sendPasswordReset,
  sendPasswordResetOTP,
  sendVerificationOTP,
  sendTicketStatusUpdate,
  sendBulkEmails,
  sendInvitationEmail
};

// Also export as default for backward compatibility
const EmailService = {
  sendEmail,
  sendInvitationEmail,
  sendWelcomeEmail,
  sendTicketNotification,
  sendProjectAssignment,
  sendPasswordReset,
  sendPasswordResetOTP,
  sendVerificationOTP,
  sendTicketStatusUpdate,
  sendBulkEmails,
};

export default EmailService;
