import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter for Gmail
console.log("Setting up email transporter with user:", process.env.EMAIL_USER,process.env.EMAIL_PASSWORD);
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
  },
});

// Alternative configuration for other email services
const createCustomTransporter = (config) => {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true for 465, false for other ports
    auth: {
      user: config.user,
      pass: config.password,
    },
  });
};

export { transporter, createCustomTransporter };
