// // import nodemailer from "nodemailer";
// // import dotenv from "dotenv";

// // import { Resend } from "resend";

// // dotenv.config();

// // const resend = new Resend(process.env.RESEND_API_KEY);

// // // Create transporter for Gmail
// // // console.log("Setting up email transporter with user:", process.env.EMAIL_USER,process.env.EMAIL_PASSWORD);
// // // const transporter = nodemailer.createTransport({
// // //   service: "gmail",
// // //   auth: {
// // //     user: process.env.EMAIL_USER,
// // //     pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
// // //   },
// // // });

// // const transporter = nodemailer.createTransport({
// //   // service: "gmail",
// //   // auth: {
// //   //   user: process.env.EMAIL_USER,
// //   //   pass: process.env.EMAIL_PASSWORD,
// //   // },
// //     host: process.env.MAILEROO_SMTP_HOST,
// //   port: Number(process.env.MAILEROO_SMTP_PORT),
// //   secure: false, // TLS
// //   auth: {
// //     user: process.env.MAILEROO_SMTP_USER,
// //     pass: process.env.MAILEROO_SMTP_PASS,
// //   },
// // });


// // // Resend SMTP Transporter
// // const resendTransporter = nodemailer.createTransport({
// //   host: "smtp.resend.com",
// //   port: 465,
// //   secure: true, // true for 465
// //   auth: {
// //     user: "resend",
// //     pass: process.env.RESEND_API_KEY,
// //   },
// // });

// // // Alternative configuration for other email services
// // const createCustomTransporter = (config) => {
// //   return nodemailer.createTransport({
// //     host: config.host,
// //     port: config.port,
// //     secure: config.secure, // true for 465, false for other ports
// //     auth: {
// //       user: config.user,
// //       pass: config.password,
// //     },
// //   });
// // };

// // export { transporter, createCustomTransporter, resend, resendTransporter };

// import nodemailer from "nodemailer";
// import dotenv from "dotenv";
// import { Resend } from "resend";

// dotenv.config();

// /* -------------------------
//    Shared Instances
// -------------------------- */

// const resend = new Resend(process.env.RESEND_API_KEY);

// /* -------------------------
//    Transporter Factories
// -------------------------- */

// const createGmailTransporter = () => {
//   console.log("[EMAIL] Using Gmail SMTP");
//   return nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASSWORD, // App Password only
//     },
//   });
// };

// // const createMailerooTransporter = () => {
// //   console.log("[EMAIL] Using Maileroo SMTP");
// //   return nodemailer.createTransport({
// //     host: process.env.MAILEROO_SMTP_HOST,
// //     port: Number(process.env.MAILEROO_SMTP_PORT || 587),
// //     secure: false, // TLS
// //     auth: {
// //       user: process.env.MAILEROO_SMTP_USER,
// //       pass: process.env.MAILEROO_SMTP_PASS,
// //     },
// //   });
// // };
// const createMailerooTransporter = () => {
//   console.log("[EMAIL] Using Maileroo SMTP");
//   // return nodemailer.createTransport({
//   //   host: process.env.MAILEROO_SMTP_HOST, // e.g. smtp.maileroo.com
//   //   port: 587,                            // ✅ MUST be 587
//   //   secure: false,                        // ✅ false for 587 (STARTTLS)
//   //   requireTLS: true,                     // ✅ IMPORTANT
//   //   auth: {
//   //     user: process.env.MAILEROO_SMTP_USER, // must be FULL EMAIL
//   //     pass: process.env.MAILEROO_SMTP_PASS,
//   //   },
//   //   tls: {
//   //     rejectUnauthorized: false,          // ✅ avoids silent TLS drop
//   //   },
//   // });
//  return nodemailer.createTransport({
//   host: process.env.MAILEROO_SMTP_HOST,
//   port: 587,              // FORCE 587
//   secure: false,
//   requireTLS: true,       // 🔴 REQUIRED NOW
//   auth: {
//     user: process.env.MAILEROO_SMTP_USER, // FULL EMAIL
//     pass: process.env.MAILEROO_SMTP_PASS,
//   },
//   tls: {
//     rejectUnauthorized: false,
//   },
//   name: process.env.MAIL_FROM.split("@")[1], // e.g. yourdomain.com
// });

// };

// const createResendTransporter = () => {
//   console.log("[EMAIL] Using Resend SMTP");
//   return nodemailer.createTransport({
//     host: "smtp.resend.com",
//     port: 465,
//     secure: true,
//     auth: {
//       user: "resend",
//       pass: process.env.RESEND_API_KEY,
//     },
//   });
// };

// /* -------------------------
//    Dynamic Transporter Selector
// -------------------------- */

// const getEmailTransporter = () => {
//   const region = (process.env.SMTP_REGION || "").toUpperCase();

//   switch (region) {
//     case "STAGING":
//       return createResendTransporter();

//     case "PROD":
//       return createMailerooTransporter();

//     default:
//       return createGmailTransporter();
//   }
// };

// /* -------------------------
//    Exported Transporters
// -------------------------- */

// const transporter = getEmailTransporter();

// const createCustomTransporter = (config) =>
//   nodemailer.createTransport({
//     host: config.host,
//     port: config.port,
//     secure: config.secure,
//     auth: {
//       user: config.user,
//       pass: config.password,
//     },
//   });

// export {
//   transporter,
//   resend,
//   createCustomTransporter,
// };
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
