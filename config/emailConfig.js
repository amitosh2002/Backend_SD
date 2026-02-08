
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

/* -------------------------
   Resend Client (API)
-------------------------- */
const resend = new Resend(process.env.RESEND_API_KEY);

/* -------------------------
   Transporters
-------------------------- */

const createGmailTransporter = () => {
  const user = process.env.EMAIL_USER;
  return {
    type: "SMTP",
    provider: "GMAIL",
    from: user,
    sendMail: async (mailOptions) => {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: user,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
      return transporter.sendMail(mailOptions);
    }
  };
};

const createResendTransporter = (region) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.MAIL_FROM || process.env.EMAIL_FROM || "onboarding@resend.dev";
  
  if (!apiKey) {
    console.error(`[EMAIL_CONFIG] ERROR: RESEND_API_KEY is not defined in ${region} environment!`);
  }

  if (from === "onboarding@resend.dev" && (region === "PROD" || process.env.NODE_ENV === "production")) {
    console.warn("\x1b[33m%s\x1b[0m", " [WARNING] You are using 'onboarding@resend.dev'. If the recipient is not your own verified email, Resend will drop this silently.");
  }

  return {
    type: "API",
    provider: `RESEND_${region}`,
    from: from,
    sendMail: async (mailOptions) => {
      const { to, subject, html, text } = mailOptions;
      try {
        const payload = {
          from: mailOptions.from || from,
          to: Array.isArray(to) ? to : [to],
          subject,
          html: html,
          text: text, // Sending both is best practice
        };

        const response = await resend.emails.send(payload);

        if (response.error) {
          console.error("[EMAIL_CONFIG] Resend API Error Response:", response.error);
          throw new Error(response.error.message || "Resend API Error");
        }

        const data = response.data || response;
        console.log(`[RESEND_SUCCESS] ID: ${data.id} | To: ${to}`);
        return { messageId: data.id || data.messageId };
      } catch (error) {
        console.error("[EMAIL_CONFIG] Resend SDK Execution Error:", error);
        throw error;
      }
    },
  };
};

/* -------------------------
   Transporter Selector
-------------------------- */

const getEmailTransporter = () => {
  const region = (process.env.SMTP_REGION || "LOCAL").toUpperCase();
  const nodeEnv = (process.env.NODE_ENV || "").toUpperCase();

  if (region === "STAGING" || region === "PROD" || nodeEnv === "PRODUCTION") {
    return createResendTransporter(region);
  }

  return createGmailTransporter();
};

/* -------------------------
   Exports
-------------------------- */

const transporter = getEmailTransporter();
console.log(`[EMAIL_INIT] Mode: ${transporter.type} | Provider: ${transporter.provider} | From: ${transporter.from}`);

export {
  transporter,
  resend, 
};
