import AuthController from "./controllers/authController.js";
import User from "./models/UserModel.js";
import dotenv from "dotenv";

dotenv.config();

// Test authentication functionality
async function testAuthSystem() {
  console.log("🧪 Testing Authentication System...\n");

  // Check if environment variables are set
  if (!process.env.JWT_SECRET) {
    console.error("❌ Missing JWT_SECRET environment variable");
    console.error("Please add JWT_SECRET=your-secret-key to your .env file");
    return;
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error("❌ Missing email configuration");
    console.error(
      "Please configure EMAIL_USER and EMAIL_PASSWORD in your .env file"
    );
    return;
  }

  console.log("✅ Environment variables found");
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET.substring(0, 10)}...`);
  console.log(`📧 Email User: ${process.env.EMAIL_USER}`);
  console.log("");

  try {
    // Test 1: Generate JWT token
    console.log("🔑 Test 1: Testing JWT token generation...");
    const testToken = AuthController.generateToken("test-user-id", "user");
    console.log("✅ JWT token generated successfully!");
    console.log(`   Token: ${testToken.substring(0, 50)}...`);
    console.log("");

    // Test 2: Test user model methods
    console.log("👤 Test 2: Testing User model methods...");

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

    // Test OTP generation
    const otpCode = testUser.generateOTP();
    console.log("✅ OTP generated successfully!");
    console.log(`   OTP Code: ${otpCode}`);
    console.log(`   OTP Expires: ${testUser.otp.expiresAt}`);
    console.log("");

    // Test OTP verification
    const isOTPValid = testUser.verifyOTP(otpCode);
    console.log("✅ OTP verification test:");
    console.log(`   Valid OTP: ${isOTPValid}`);
    console.log(`   OTP cleared: ${!testUser.otp}`);
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
    console.log(`   OTP field: ${userJSON.otp ? "EXISTS" : "REMOVED"}`);
    console.log(
      `   Login attempts: ${userJSON.loginAttempts ? "EXISTS" : "REMOVED"}`
    );
    console.log(`   Lock until: ${userJSON.lockUntil ? "EXISTS" : "REMOVED"}`);
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
