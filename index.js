import express from "express";
import { dbConfig } from "./db/dbConfig.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import projectRoutes from "./routes/projectRoutes/projectRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/UserRoutes/userRoutes.js"
import configuratorRoute from "./routes/SprintRoutes/confriguratorRoute.js";
import cors from "cors";
import keyValueRoute from "./routes/keyValuePairRoutes.js";
import githubrouter from "./routes/Github/githubreporoutes.js";
import githubAuthRouter from "./routes/Github/githubAuthRoutes.js";
import inviteRoutes from "./routes/inviteRoutes.js";
import sprintRoutes from "./routes/SprintRoutes/sprintRouteV1.js"
import "./cronjs/cronjob.js";
import guiRoutes from './routes/GUI_routes/guiRoutes.js';
import aiRouter from "./routes/alRoute/aiRoute.js";
// import aiRouter from "./routes/alRoute/aiRoute.js";
import googleLoginRoute from "./routes/SSO/googleLogin.js";
import serviceRoutes from "./routes/HoraInternal/serviceRoutes.js";
import { authenticateToken } from "./middleware/authMiddleware.js";
import {generateDashboard} from "./utility/serverdashboard.js";
// import { MongoClient } from 'mongodb';
// import bodyParser from 'body-parser';
// import dotenv from 'dotenv';
dotenv.config();
const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(express.json());

// cors


const allowedOrigins = [
  "http://localhost:5173",
  "https://sd-tracking.onrender.com",
  "https://dev-hora.netlify.app",
  "https://stage-hora.netlify.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like Postman) or those in allowedOrigins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "authorization",
      "X-Custom-Token",
    ],
    credentials: true,
    preflightContinue: false, // Pass OPTIONS requests to next handler
    optionsSuccessStatus: 204, // Return 204 for successful OPTIONS requests
  })
);

// Optional: handle CORS errors globally
app.use((err, req, res, next) => {
  if (err instanceof Error && err.message === "Not allowed by CORS") {
    res.status(403).json({ message: err.message });
  } else {
    next(err);
  }
});


//Db connection
console.log("Connecting to MongoDB with URI:", dbConfig.url);
mongoose
  .connect(dbConfig.url, dbConfig.options)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

const startServer = () => {
  app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}.`);
  });
};

// const mongoUri = process.env.MONGODB_URI;
// // console.log(mongoUri);
// if (mongoUri) {
//   mongoose
//     .connect(mongoUri)
//     .then(() => {
//       console.log("✅ Connected to MongoDB.");
//       startServer();
//     })
//     .catch((err) => {
//       console.error("❌ MongoDB connection error:", err.message);
//       console.warn("⚠️ Starting server without DB connection.");
//       startServer();
//     });
// } else {
//   console.warn(
//     "⚠️ MONGODB_URI not set. Starting server without DB connection."
//   );
startServer();
// }

// routes initiliztion

//ai routes
app.use("/api/ai", aiRouter);

app.use("/api/platform", projectRoutes); // routes for each project
app.use("/api/platform", ticketRoutes); // ticket routes
app.use("/api/email", emailRoutes); // email routes
app.use("/api/auth", authRoutes); // authentication routes
//key value pair routes
app.use("/api/platform", keyValueRoute);
app.use("/api/platform", userRoutes);
app.use("/api/hora/v1/services", serviceRoutes);
// for github intregation 
app.use("/api/gihub-repo",githubrouter)
app.use("/api/auth/github", githubAuthRouter);
// app.use("/api/partner",inviteRoutes);
app.use("/api/partner",inviteRoutes);
app.use("/api/auth/sso", googleLoginRoute);

//sprint routes
app.use("/api/sprint", sprintRoutes);
// Sprint board configurator routes (protected)
app.use("/api/sprint/configurator", authenticateToken, configuratorRoute);


// user routes
app.use("/api/platform", userRoutes);

app.get("/server", (req, res) => {
  res.send("Hello World!");
  
}



);

app.use('/api/gui',guiRoutes);
// table/otp

// Route 1: Main Server Stats
app.get("/get/server", (req, res) => {
    const html = generateDashboard({ 
        title: "Production Monitor",
        accentColor: "#8b5cf6" 
    });
    res.send(html);
}); // Fixed: changed comma to semicolon

// Route 2: Analytics for a specific project
app.get("/analytics", (req, res) => {
    const html = generateDashboard({
        title: "Hora Project Stats",
        accentColor: "#0ea5e9", // Blue
        customMessage: "Backend server analytics"
    });
    res.send(html);
}); // Fixed: changed comma to semicolon

// Start the server
app.listen(8000, () => {
    console.log("Dashboard active on http://localhost:8000/get/server");

}); // Fixed: removed extra parentheses and commas
