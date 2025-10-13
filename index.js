import express from "express";
import { dbConfig } from "./db/dbConfig.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import projectRoutes from "./routes/projectRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/UserRoutes/userRoutes.js"
import cors from "cors";
import keyValueRoute from "./routes/keyValuePairRoutes.js";
import githubrouter from "./routes/Github/githubreporoutes.js";
import "./cronjs/cronjob.js";

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
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        // 💡 ADDITION: Allow common headers needed for authentication and content type
    allowedHeaders: ['Content-Type', 'Authorization', 'authorization','X-Custom-Token'], 
    
    // Allow credentials (cookies/auth headers) to be sent
    credentials: true,
  })
);

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
app.use("/api/platform", projectRoutes); // routes for each project
app.use("/api/platform", ticketRoutes); // ticket routes
app.use("/api/email", emailRoutes); // email routes
app.use("/api/auth", authRoutes); // authentication routes
//key value pair routes
app.use("/api/platform", keyValueRoute);
app.use("/api/platform", userRoutes);
// for github intregation 
app.use("/api/gihub-repo",githubrouter)
app.get("/server", (req, res) => {
  res.send("Hello World!");
});
