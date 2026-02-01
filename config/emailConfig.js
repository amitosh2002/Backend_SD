
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
  console.log("[EMAIL] Using Gmail SMTP (DEV)");
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // App Password ONLY
    },
  });
};

const createResendTransporter = () => {
  console.log("[EMAIL] Using Resend SDK Wrapper");
  return {
    sendMail: async (mailOptions) => {
      const { from, to, subject, html, text } = mailOptions;
      try {
        const data = await resend.emails.send({
          from: from || process.env.EMAIL_FROM || "onboarding@resend.dev",
          to: Array.isArray(to) ? to : [to],
          subject,
          html: html || text,
        });
        return { messageId: data.id, ...data };
      } catch (error) {
        console.error("[EMAIL] Resend SDK Error:", error);
        throw error;
      }
    },
  };
};

/* -------------------------
   Transporter Selector
-------------------------- */

const getEmailTransporter = () => {
  const region = (process.env.SMTP_REGION || "").toUpperCase();

  if (region === "STAGING" || region === "PROD") {
    return createResendTransporter();
  }

  return createGmailTransporter();
};

/* -------------------------
   Exports
-------------------------- */

const transporter = getEmailTransporter();

export {
  transporter,
  resend, // use API directly for OTP
};
