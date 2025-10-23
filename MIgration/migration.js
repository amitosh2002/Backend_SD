import mongoose from "mongoose";
import { PartnerModel } from "../models/PlatformModel/partnerModel.js";
import { TicketModel } from "../models/TicketModels.js";
import { ProjectModel } from "../models/PlatformModel/ProjectModels.js";
import { UserWorkAccess } from "../models/PlatformModel/UserWorkAccessModel.js";

// Fixed Migration - Method 1: Using updateMany (Recommended)
export const runMigrationForUpdatePartner = async () => {
  try {
    console.log('Starting migration to update partnerCode...');
    
    // Update all tickets at once
    const result = await TicketModel.updateMany(
      {}, // Empty filter means all documents
      { 
        $set: { 
          partnerCode: "AMIT2002" 
        } 
      }
    );
    
    console.log(`Migration completed successfully!`);
    console.log(`Matched: ${result.matchedCount} documents`);
    console.log(`Modified: ${result.modifiedCount} documents`);
    
    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Alternative Method 2: Using individual updates (slower but more control)
export const runMigrationForUpdatePartnerIndividual = async () => {
  try {
    console.log('Starting individual migration to update partnerCode...');
    
    // Find all tickets
    const all_tickets = await TicketModel.find();
    
    console.log(`Found ${all_tickets.length} tickets to update`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Update each ticket individually
    for (const ticket of all_tickets) {
      try {
        ticket.partnerCode = "AMIT2002";
        await ticket.save();
        successCount++;
      } catch (error) {
        console.error(`Failed to update ticket ${ticket._id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`Migration completed!`);
    console.log(`Success: ${successCount} tickets`);
    console.log(`Errors: ${errorCount} tickets`);
    
    return {
      success: true,
      successCount,
      errorCount,
      total: all_tickets.length
    };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Alternative Method 3: Using bulkWrite (Best for large datasets)
export const runMigrationForUpdatePartnerBulk = async () => {
  try {
    console.log('Starting bulk migration to update partnerCode...');
    
    // Find all tickets
    const all_tickets = await TicketModel.find().lean();
    
    console.log(`Found ${all_tickets.length} tickets to update`);
    
    // Prepare bulk operations
    const bulkOps = all_tickets.map(ticket => ({
      updateOne: {
        filter: { _id: ticket._id },
        update: { 
          $set: { 
            partnerCode: "AMIT2002" 
          } 
        }
      }
    }));
    
    // Execute bulk operation
    const result = await TicketModel.bulkWrite(bulkOps);
    
    console.log(`Migration completed successfully!`);
    console.log(`Matched: ${result.matchedCount} documents`);
    console.log(`Modified: ${result.modifiedCount} documents`);
    
    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Alternative Method 4: Conditional Update (Only update if field doesn't exist)
export const runMigrationForUpdatePartnerConditional = async () => {
  try {
    console.log('Starting conditional migration to update partnerCode...');
    
    // Only update documents that don't have partnerCode or have null/empty partnerCode
    const result = await TicketModel.updateMany(
      { 
        $or: [
          { partnerCode: { $exists: false } },
          { partnerCode: null },
          { partnerCode: "" }
        ]
      },
      { 
        $set: { 
          partnerCode: "AMIT2002" 
        } 
      }
    );
    
    console.log(`Migration completed successfully!`);
    console.log(`Matched: ${result.matchedCount} documents`);
    console.log(`Modified: ${result.modifiedCount} documents`);
    
    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Alternative Method 5: With Progress Tracking (For large datasets)
export const runMigrationForUpdatePartnerWithProgress = async () => {
  try {
    console.log('Starting migration with progress tracking...');
    
    const batchSize = 100; // Process in batches
    const totalCount = await TicketModel.countDocuments();
    
    console.log(`Total tickets to update: ${totalCount}`);
    
    let processed = 0;
    let page = 0;
    
    while (processed < totalCount) {
      const tickets = await TicketModel.find()
        .skip(page * batchSize)
        .limit(batchSize);
      
      if (tickets.length === 0) break;
      
      // Update batch
      const bulkOps = tickets.map(ticket => ({
        updateOne: {
          filter: { _id: ticket._id },
          update: { 
            $set: { 
              partnerCode: "AMIT2002" 
            } 
          }
        }
      }));
      
      await TicketModel.bulkWrite(bulkOps);
      
      processed += tickets.length;
      page++;
      
      const progress = ((processed / totalCount) * 100).toFixed(2);
      console.log(`Progress: ${progress}% (${processed}/${totalCount})`);
    }
    
    console.log(`Migration completed! Total processed: ${processed}`);
    
    return {
      success: true,
      totalProcessed: processed
    };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Helper function to run migration with rollback capability
export const runMigrationWithRollback = async () => {
  const session = await TicketModel.startSession();
  session.startTransaction();
  
  try {
    console.log('Starting migration with transaction...');
    
    // Backup old values (optional)
    const oldTickets = await TicketModel.find().session(session).lean();
    
    // Perform update
    const result = await TicketModel.updateMany(
      {},
      { 
        $set: { 
          partnerCode: "AMIT2002" 
        } 
      },
      { session }
    );
    
    console.log(`Updated ${result.modifiedCount} tickets`);
    
    // Commit transaction
    await session.commitTransaction();
    console.log('Migration committed successfully!');
    
    return {
      success: true,
      modifiedCount: result.modifiedCount,
      backup: oldTickets // Return backup for rollback if needed
    };
  } catch (error) {
    console.error('Migration failed, rolling back...');
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Usage Example in your application
export const executeMigration = async () => {
  try {
    // Choose the method that best fits your needs
    await runMigrationForUpdatePartner(); // Simple and fast
    
    // OR use one of the alternatives:
    // await runMigrationForUpdatePartnerIndividual();
    // await runMigrationForUpdatePartnerBulk();
    // await runMigrationForUpdatePartnerConditional();
    // await runMigrationForUpdatePartnerWithProgress();
    // await runMigrationWithRollback();
    
  } catch (error) {
    console.error('Failed to execute migration:', error);
    process.exit(1);
  }
};

export const runMigrationToCreatePartner = async () => {
  try {
    console.log("🚀 Partner create migration start");

    // Check if partner already exists
    const existing = await PartnerModel.findOne({ partnerCode: "AMIT2002" });
    if (existing) {
      console.log("⚠️ Partner already exists:", existing._id);
      return existing;
    }

    // Create new partner
    const partner = await PartnerModel.create({
      partnerId: "AMIT2002",
      partnerCode: "AMIT2002",
      partnerName: "Amit Testing Partner",
      contactPerson: "Amit Kumar",
      email: "amitoshroy2002@gmail.com",
      businessName: "Hora Software Solutions",  
      phone: "1234567890",
      businessType: "service",
      address: "123, Test Street, Test City, Test Country",
      isActive: true,
    });

    console.log("✅ Partner created successfully:", partner._id);
    return partner;
  } catch (error) {
    console.error("❌ Error creating partner:", error);
    throw error;
  }
};

export const runMigrationToAddProjectIdinTicket = async()=>{
  try {
    console.log("Add projectId in ticket migration start")
    const tickets = await TicketModel.find();
    for(const ticket of tickets){
      ticket.projectId = "64b8f4f5f1d2c926d8e4b8c1";
; // Example projectId, replace with actual logic if needed
      ticket.partnerId="AMIT2002"; // Example projectId, replace with actual logic if needed
      await ticket.save({ validateBeforeSave: false }); // ✅ skip schema validation
    } 
    console.log("Add projectId in ticket migration end")
  } catch (error) {
    console.error('Error adding projectId in tickets:', error);
  }
}

export const runMigrationToCreateProject = async () => {
  try {
    console.log("Project creation migration started...");

    // 1️⃣ Find the Partner to attach this project to
    const partner = await PartnerModel.findOne({ partnerCode: "AMIT2002" });
    if (!partner) {
      throw new Error("Partner with code 'AMIT2002' not found. Please create the partner first.");
    }

    // 2️⃣ Create a new Project document
    const newProject = await ProjectModel.create({
      projectId:"64b8f4f5f1d2c926d8e4b8c1",
      partnerId: partner.partnerId,
      partnerCode: partner.partnerCode,
      name: "Amit Test Project",
      description: {
        overview: "This project was created via migration for testing.",
        objectives: [
          "Validate project creation migration",
          "Ensure relationship with Partner works properly"
        ]
      },
      startDate: new Date("2025-10-01"),
      status: "active",
      category: "Internal Testing",
      budget: 50000,
      images: [
        {
          url: "https://example.com/project-image.jpg",
          altText: "Project banner image"
        }
      ],
    });

    console.log("✅ Project created successfully:", newProject._id);
    console.log("Project creation migration completed!");
    return newProject;
  } catch (error) {
    console.error("❌ Error creating project:", error);
  }
};


export const runMigrationToAddUserAccess = async () => {
  try {
    console.log("Starting migration to add user access...");

    // 🔹 Connect to MongoDB
    console.log("Connected to MongoDB ✅");

    // 🔹 Define the user and project info
    const userId = "68a9f7f1eda6ac5064a5d87e"; // replace with your actual user _id
    const partnerId = "AMIT2002";              // from your project data
    const projectId = "64b8f4f5f1d2c926d8e4b8c1"; // from your project data

    // 🔹 Define the access type
    const accessType = 300; // 100=viewer, 200=manager, 300=admin

    // 🔹 Check if access record already exists
    const existingAccess = await UserWorkAccess.findOne({
      userId,
      partnerId,
      projectId,
    });

    if (existingAccess) {
      console.log("Access record already exists. Skipping insert.");
    } else {
      // 🔹 Create the new access record
      const newAccess = await UserWorkAccess.create({
        userId,
        partnerId,
        projectId,
        accessType,
        invitedBy: userId,
        status: "accepted",
      });

      console.log("✅ User access record created:", newAccess);
    }

  } catch (error) {
    console.error("❌ Error during migration:", error);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  }
};

// // Run the migration directly if you’re executing this file
// if (process.argv[1] === new URL(import.meta.url).pathname) {
//   runMigrationToAddUserAccess();
// }