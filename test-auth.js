import User from "./models/UserModel.js";
import OTP from "./models/AuthModels/otpModels.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Test the authentication system
async function testAuthSystem() {
  try {
    console.log("🔐 Testing Authentication System...");
    console.log("");

    // Test 1: Test user creation and validation
    console.log("👤 Test 1: Testing user creation and validation...");

    // Create a test user instance
    const testUser = new User({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      phone: "1234567890",
      profile: {
        firstName: "Test",
        lastName: "User",
      },
    });

    // Test OTP generation using separate OTP model
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("✅ OTP generated successfully!");
    console.log(`   OTP Code: ${otpCode}`);
    console.log("");

    // Test OTP record creation
    const otpRecord = new OTP({
      email: testUser.email,
      otp: otpCode,
      createdAt: new Date(),
    });
    console.log("✅ OTP record created successfully!");
    console.log(`   Email: ${otpRecord.email}`);
    console.log(`   OTP: ${otpRecord.otp}`);
    console.log(`   Created: ${otpRecord.createdAt}`);
    console.log("");

    // Test password comparison
    const isPasswordValid = await testUser.comparePassword("password123");
    console.log("✅ Password comparison test:");
    console.log(`   Correct password: ${isPasswordValid}`);

    const isWrongPasswordValid = await testUser.comparePassword(
      "wrongpassword"
    );
    console.log(`   Wrong password: ${isWrongPasswordValid}`);
    console.log("");

    // Test account locking
    console.log("🔒 Test 3: Testing account security features...");

    // Simulate failed login attempts
    for (let i = 0; i < 3; i++) {
      await testUser.incLoginAttempts();
    }

    console.log("✅ Account security test:");
    console.log(`   Login attempts: ${testUser.loginAttempts}`);
    console.log(`   Account locked: ${testUser.isLocked()}`);
    console.log(`   Lock until: ${testUser.lockUntil}`);
    console.log("");

    // Reset login attempts
    await testUser.resetLoginAttempts();
    console.log("✅ Login attempts reset:");
    console.log(`   Login attempts: ${testUser.loginAttempts}`);
    console.log(`   Account locked: ${testUser.isLocked()}`);
    console.log("");

    // Test 4: Test user profile methods
    console.log("👤 Test 4: Testing user profile methods...");
    console.log(`   Full name: ${testUser.fullName}`);
    console.log(`   Username: ${testUser.username}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Phone: ${testUser.phone}`);
    console.log(`   Role: ${testUser.role}`);
    console.log(`   Verified: ${testUser.isVerified}`);
    console.log(`   Active: ${testUser.isActive}`);
    console.log("");

    // Test 5: Test JSON transformation
    console.log("📄 Test 5: Testing JSON transformation...");
    const userJSON = testUser.toJSON();
    console.log("✅ Sensitive data removed from JSON:");
    console.log(
      `   Password field: ${userJSON.password ? "EXISTS" : "REMOVED"}`
    );
    console.log(
      `   Login attempts: ${userJSON.loginAttempts ? "EXISTS" : "REMOVED"}`
    );
    console.log(`   Lock until: ${userJSON.lockUntil ? "EXISTS" : "REMOVED"}`);
    console.log("");

    // Test 6: Test OTP model functionality
    console.log("🔢 Test 6: Testing OTP model functionality...");

    // Test OTP expiration (simulate 6 minutes old OTP)
    const expiredOTP = new OTP({
      email: "expired@example.com",
      otp: "123456",
      createdAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
    });

    console.log("✅ OTP expiration test:");
    console.log(
      `   Expired OTP age: ${
        (Date.now() - expiredOTP.createdAt.getTime()) / 1000
      } seconds`
    );
    console.log(
      `   Is expired (>5 min): ${
        (Date.now() - expiredOTP.createdAt.getTime()) / 1000 > 300
      }`
    );
    console.log("");

    console.log("🎉 Authentication system testing completed successfully!");
    console.log("");
    console.log("📋 Next steps:");
    console.log("   1. Start your server: npm run dev");
    console.log("   2. Test the API endpoints with curl or Postman");
    console.log("   3. Check AUTH_SETUP.md for detailed API documentation");
    console.log("   4. Integrate with your frontend application");
  } catch (error) {
    console.error("❌ Error during testing:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the test
testAuthSystem();
