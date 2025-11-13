// import { runMigrationForUpdatePartnerWithProgress, runMigrationToAddProjectIdinTicket, runMigrationToCreatePartner, runMigrationToCreateProject } from '../MIgration/migration.js';
// import { dbConfig } from '../db/dbConfig.js';
// import mongoose from 'mongoose';
// import dotenv from 'dotenv';

// dotenv.config();

// async function main() {
//     try {
//         // Connect to MongoDB
//         console.log('Connecting to MongoDB...');
//         await mongoose.connect(dbConfig.url, dbConfig.options);
//         console.log('Connected to MongoDB successfully');

//         // Run the migration
//         console.log('Starting migration...');
//         // const result = await runMigrationToCreatePartner();
//         // const result = await runMigrationForUpdatePartnerWithProgress();
//         const result = await runMigrationToCreateProject();
//         console.log('Migration result:', result);

//     } catch (error) {
//         console.error('Migration failed:', error);
//     } finally {
//         // Close the MongoDB connection
//         await mongoose.connection.close();
//         console.log('Closed MongoDB connection');
//     }
// }

// // Run the script
// main();

import mongoose from "mongoose";
import dotenv from "dotenv";
import { dbConfig } from "../db/dbConfig.js";
import {
  runMigrationForUpdatePartnerWithProgress,
  runMigrationToAddProjectIdinTicket,
  runMigrationToCreatePartner,
  runMigrationToCreateProject,
  runMigrationToAddUserAccess
} from "../MIgration/migration.js";

dotenv.config();

// ✅ Map migration names to functions
const migrations = {
  createPartner: runMigrationToCreatePartner,
  updatePartnerProgress: runMigrationForUpdatePartnerWithProgress,
  createProject: runMigrationToCreateProject,
  addProjectToTicket: runMigrationToAddProjectIdinTicket,
  addUserAccess: runMigrationToAddUserAccess,
};

async function main() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(dbConfig.url, dbConfig.options);
    console.log("✅ Connected to MongoDB successfully.\n");

    // Get migration args (can be one or many)
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log("⚠️  No migration specified.");
      console.log("👉 Usage: node runMigration.js [migrationName | all]");
      console.log("Available migrations:", Object.keys(migrations).join(", "));
      process.exit(1);
    }

    if (args.includes("all")) {
      console.log("🚀 Running ALL migrations sequentially...\n");
      for (const [name, fn] of Object.entries(migrations)) {
        console.log(`▶️  Running migration: ${name}`);
        await fn();
        console.log(`✅ Completed migration: ${name}\n`);
      }
    } else {
      for (const name of args) {
        const fn = migrations[name];
        if (!fn) {
          console.log(`❌ Migration "${name}" not found. Skipping.`);
          continue;
        }
        console.log(`▶️  Running migration: ${name}`);
        await fn();
        console.log(`✅ Completed migration: ${name}\n`);
      }
    }

    console.log("🎉 All requested migrations completed successfully.");

  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔒 Closed MongoDB connection.");
  }
}

main();
