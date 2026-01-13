// import EmailService from "./services/emailService.js";
import dotenv from "dotenv";
import { sendEmail, sendWelcomeEmail } from "./services/emailService.js";

dotenv.config();

// Test email functionality
async function testEmailService() {
  console.log("🧪 Testing Email Service...\n");

  // Check if environment variables are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error("❌ Missing environment variables:");
    console.error("   - EMAIL_USER");
    console.error("   - EMAIL_PASSWORD");
    console.error(
      "\nPlease check your .env file and EMAIL_SETUP.md for instructions."
    );
    return;
  }

  console.log("✅ Environment variables found");
  console.log(`📧 Email User: ${process.env.EMAIL_USER}`);
  console.log("");

  try {
    // Test 1: Simple email
    console.log("📤 Test 1: Sending simple email...");
    const testEmail = process.env.TEST_EMAIL || "test@example.com";

    const result1 = await sendEmail(
      testEmail,
      "Test Email from Backend",
      "This is a test email to verify the email service is working.",
      "<h2>Test Email</h2><p>This is a test email to verify the email service is working.</p>"
    );

    if (result1.success) {
      console.log("✅ Simple email sent successfully!");
      console.log(`   Message ID: ${result1.messageId}`);
    } else {
      console.log("❌ Failed to send simple email:", result1.error);
    }

    console.log("");

    // Test 2: Welcome email
    console.log("📤 Test 2: Sending welcome email...");
    const result2 = await sendWelcomeEmail(testEmail, "Test User");

    if (result2.success) {
      console.log("✅ Welcome email sent successfully!");
      console.log(`   Message ID: ${result2.messageId}`);
    } else {
      console.log("❌ Failed to send welcome email:", result2.error);
    }

    console.log("");

    // Test 3: Ticket notification
    console.log("📤 Test 3: Sending ticket notification...");
    const result3 = await sendTicketNotification(
      testEmail,
      "TICKET-001",
      "Test Bug Report",
      "In Progress"
    );

    if (result3.success) {
      console.log("✅ Ticket notification sent successfully!");
      console.log(`   Message ID: ${result3.messageId}`);
    } else {
      console.log("❌ Failed to send ticket notification:", result3.error);
    }

    console.log("");

    // Test 4: Project assignment
    console.log("📤 Test 4: Sending project assignment...");
    const result4 = await sendProjectAssignment(
      testEmail,
      "Test Project",
      "Developer"
    );

    if (result4.success) {
      console.log("✅ Project assignment email sent successfully!");
      console.log(`   Message ID: ${result4.messageId}`);
    } else {
      console.log("❌ Failed to send project assignment email:", result4.error);
    }

    console.log("\n🎉 Email service testing completed!");
  } catch (error) {
    console.error("❌ Error during testing:", error.message);
  }
}

// Run the test
testEmailService();
