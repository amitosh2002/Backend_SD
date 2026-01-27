
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
  console.log("[EMAIL] Using Resend SMTP");
  return nodemailer.createTransport({
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    auth: {
      user: "resend",
      pass: process.env.RESEND_API_KEY, // 🔑 API KEY here
    },
  });
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
