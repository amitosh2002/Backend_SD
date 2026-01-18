
import { transporter } from "../config/emailConfig.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------------------------------- */
/* Template Compiler                  */
/* ---------------------------------- */
const compileTemplate = (templateName, data) => {
  const templatePath = path.join(
    __dirname,
    "../Templates",
    `${templateName}.handlebars`
  );

  const source = fs.readFileSync(templatePath, "utf8");
  return Handlebars.compile(source)(data);
};

/* ---------------------------------- */
/* Status Color Helper                */
/* ---------------------------------- */
const getStatusColor = (status = "") => {
  const map = {
    open: "#e53e3e",
    in_progress: "#3182ce",
    resolved: "#38a169",
    closed: "#718096",
    pending: "#d69e2e",
  };

  return map[status.toLowerCase()] || "#718096";
};



const getFromEmail = () => {
  const region = process.env.SMTP_REGION;

  if (region === "STAGING") {
    return process.env.RESEND_FROM_EMAIL;
  }

  if (region === "PROD") {
    return process.env.MAIL_FROM;
  }

  // LOCAL / default (Gmail)
  return process.env.EMAIL_USER;
};


/* ---------------------------------- */
/* Core Send Email (SINGLE ENTRY)     */
/* ---------------------------------- */
// const sendEmail = async (to, subject, text, html) => {
//   try {
//     const region = process.env.SMTP_REGION || "LOCAL";


//     if (!getFromEmail) {
//       throw new Error("MAIL_FROM / EMAIL_USER not configured");
//     }

//     console.log(
//       `[sendEmail] region=${region} | to=${to} | subject=${subject}`
//     );

//     const mailOptions = {
//       from: `${getFromEmail}`,
//       // from: `"Hora" <${getFromEmail}>`,

//       to,
//       subject,
//       text,
//       html,
//     };

//     const result = await transporter.sendMail(mailOptions);

//     console.log(
//       `[sendEmail] SUCCESS | provider=${region} | messageId=${result.messageId}`
//     );

//     return {
//       success: true,
//       messageId: result.messageId,
//       provider: region,
//     };
//   } catch (error) {
//     console.error("[sendEmail] FAILED:", error);
//     return { success: false, error: error.message };
//   }
// };
const sendEmail = async (to, subject, text, html) => {
  try {
    const region = process.env.SMTP_REGION || "LOCAL";
    const fromEmail = getFromEmail();

    if (!fromEmail) {
      throw new Error("MAIL_FROM / EMAIL_USER not configured");
    }

    console.log(
      `[sendEmail] region=${region} | from=${fromEmail} | to=${to} | subject=${subject}`
    );

    const mailOptions = {
      from: fromEmail, // ✅ CORRECT
      to,
      subject,
      text,
      html,
    };

    const result = await transporter.sendMail(mailOptions);

    console.log(
      `[sendEmail] SUCCESS | provider=${region} | messageId=${result.messageId}`
    );

    return {
      success: true,
      messageId: result.messageId,
      provider: region,
    };
  } catch (error) {
    console.error("[sendEmail] FAILED:", error);
    return { success: false, error: error.message };
  }
};

/* ---------------------------------- */
/* Welcome Email                      */
/* ---------------------------------- */
const sendWelcomeEmail = async (to, user) => {
  const subject = "Welcome to Hora 🎉";

  const html = compileTemplate("welcome", {
    user_name: user.firstName || user.username,
    app_url: process.env.FRONTEND_URL,
  });

  return sendEmail(
    to,
    subject,
    `Welcome ${user.firstName || user.username}`,
    html
  );
};

/* ---------------------------------- */
/* Invitation Email                   */
/* ---------------------------------- */
const sendInvitationEmail = async (data) => {
  const subject = `Invitation to join ${data.partnerName} on Hora`;

  const html = compileTemplate("invitationTemplate", data);

  return sendEmail(data.to, subject, data.invitationLink, html);
};

/* ---------------------------------- */
/* Password Reset OTP                 */
/* ---------------------------------- */
const sendPasswordResetOTP = async (to, user, otp) => {
  const subject = "Password Reset OTP";

  const html = compileTemplate("resetPasswordOTP", {
    user_name: user.firstName || user.username,
    otp_code: otp,
    expiry_time: "10 minutes",
  });

  return sendEmail(
    to,
    subject,
    `Your OTP is ${otp}. Valid for 10 minutes.`,
    html
  );
};

/* ---------------------------------- */
/* Verification OTP                   */
/* ---------------------------------- */
const sendVerificationOTP = async (to, user, otp) => {
  const subject = "Account Verification OTP";

  const html = compileTemplate("otpTemplate", {
    otp_code: otp,
    expiry_time: "10 minutes",
  });

  return sendEmail(
    to,
    subject,
    `Your verification OTP is ${otp}`,
    html
  );
};

/* ---------------------------------- */
/* Ticket Status Update               */
/* ---------------------------------- */
const sendTicketStatusUpdate = async (to, ticket) => {
  const subject = `Ticket Update: ${ticket.subject}`;

  const html = compileTemplate("ticketStatus", {
    user_name: ticket.userName,
    ticket_id: ticket.id,
    ticket_subject: ticket.subject,
    ticket_status: ticket.status,
    status_bg_color: getStatusColor(ticket.status),
    ticket_url: `${process.env.FRONTEND_URL}/tickets/${ticket.id}`,
  });

  return sendEmail(
    to,
    subject,
    `Ticket ${ticket.id} status updated to ${ticket.status}`,
    html
  );
};

/* ---------------------------------- */
/* Bulk Emails                        */
/* ---------------------------------- */
const sendBulkEmails = async (recipients, subject, text, html) => {
  const results = [];

  for (const email of recipients) {
    const res = await sendEmail(email, subject, text, html);
    results.push({ email, ...res });
  }

  return results;
};

/* ---------------------------------- */
/* Exports                            */
/* ---------------------------------- */
export {
  sendEmail,
  sendWelcomeEmail,
  sendInvitationEmail,
  sendPasswordResetOTP,
  sendVerificationOTP,
  sendTicketStatusUpdate,
  sendBulkEmails,
};

export default {
  sendEmail,
  sendWelcomeEmail,
  sendInvitationEmail,
  sendPasswordResetOTP,
  sendVerificationOTP,
  sendTicketStatusUpdate,
  sendBulkEmails,
};
