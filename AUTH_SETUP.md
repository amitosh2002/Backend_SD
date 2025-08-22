# Authentication System Setup Guide

This guide explains how to set up and use the complete authentication system with OTP verification.

## 🚀 Features

- **User Registration** with email verification
- **OTP-based Login** (no password required for login)
- **Account Verification** via email OTP
- **Password Management** (change password, forgot password)
- **JWT Token Authentication**
- **Role-based Access Control** (user, manager, admin)
- **Account Security** (login attempts, account locking)
- **Profile Management**

## 📋 Prerequisites

1. **Email Service**: Configured nodemailer (see EMAIL_SETUP.md)
2. **Database**: MongoDB connection
3. **Environment Variables**: JWT secret and email configuration

## 🔧 Environment Variables

Add these to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Email Configuration (from EMAIL_SETUP.md)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:3000

# Database (if not already set)
MONGODB_URI=your_mongodb_connection_string
```

## 📡 API Endpoints

### Public Routes (No Authentication Required)

#### 1. User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification code.",
  "user": {
    "id": "user_id",
    "username": "johndoe",
    "email": "john@example.com",
    "phone": "1234567890",
    "isVerified": false
  }
}
```

#### 2. Send Login OTP

```http
POST /api/auth/send-login-otp
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "OTP sent successfully to your email",
  "email": "john@example.com"
}
```

#### 3. Verify OTP and Login

```http
POST /api/auth/verify-login
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "username": "johndoe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "user",
    "isVerified": true,
    "profile": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

#### 4. Resend Verification OTP

```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### 5. Verify Account

```http
POST /api/auth/verify-account
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

#### 6. Forgot Password

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### 7. Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

### Protected Routes (Authentication Required)

**Headers:**

```http
Authorization: Bearer your_jwt_token_here
```

#### 8. Get Profile

```http
GET /api/auth/profile
Authorization: Bearer your_jwt_token_here
```

#### 9. Update Profile

```http
PUT /api/auth/profile
Authorization: Bearer your_jwt_token_here
Content-Type: application/json

{
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "bio": "Software Developer"
}
```

#### 10. Change Password

```http
PUT /api/auth/change-password
Authorization: Bearer your_jwt_token_here
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### 11. Logout

```http
POST /api/auth/logout
Authorization: Bearer your_jwt_token_here
```

## 🔐 Authentication Flow

### 1. User Registration Flow

```
User fills registration form →
System creates user account →
Generates verification OTP →
Sends OTP via email →
User verifies OTP →
Account marked as verified
```

### 2. User Login Flow

```
User enters email →
System sends OTP to email →
User enters OTP →
System verifies OTP →
Generates JWT token →
User logged in
```

### 3. Password Reset Flow

```
User requests password reset →
System generates OTP →
Sends OTP via email →
User enters OTP + new password →
Password updated
```

## 🛡️ Security Features

### Account Locking

- **5 failed login attempts** → Account locked for **2 hours**
- **Rate limiting** → Max **3 OTP requests per minute**

### OTP Security

- **6-digit numeric codes**
- **10-minute expiration**
- **Single-use** (cleared after verification)

### JWT Security

- **24-hour expiration**
- **User validation** on each request
- **Account status checking**

## 🎭 Role-Based Access Control

### User Roles

- **user**: Basic access
- **manager**: Enhanced access + user management
- **admin**: Full system access

### Middleware Usage

```javascript
import {
  requireAdmin,
  requireManager,
  requireVerified,
} from "../middleware/authMiddleware.js";

// Admin only route
router.get(
  "/admin/users",
  authenticateToken,
  requireAdmin,
  adminController.getUsers
);

// Manager or Admin route
router.put(
  "/projects/:id",
  authenticateToken,
  requireManager,
  projectController.updateProject
);

// Verified user route
router.post(
  "/tickets",
  authenticateToken,
  requireVerified,
  ticketController.createTicket
);
```

## 📱 Frontend Integration

### 1. Store JWT Token

```javascript
// After successful login
localStorage.setItem("token", response.data.token);
```

### 2. Include Token in Requests

```javascript
const token = localStorage.getItem("token");
const response = await axios.get("/api/auth/profile", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### 3. Handle Token Expiration

```javascript
// Add response interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

## 🧪 Testing the System

### 1. Test Registration

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "phone": "1234567890",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 2. Test Login OTP

```bash
curl -X POST http://localhost:8000/api/auth/send-login-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

### 3. Test OTP Verification

```bash
curl -X POST http://localhost:8000/api/auth/verify-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'
```

## 🔍 Troubleshooting

### Common Issues

1. **"Invalid login credentials"**

   - Check if email service is configured correctly
   - Verify Gmail app password

2. **"User not found"**

   - Ensure user exists in database
   - Check email spelling

3. **"OTP expired"**

   - OTPs expire after 10 minutes
   - Request new OTP

4. **"Account locked"**

   - Wait 2 hours or contact admin
   - Account locks after 5 failed attempts

5. **"JWT token expired"**
   - Token expires after 24 hours
   - User needs to login again

### Debug Mode

Enable debug logging in your `.env`:

```env
DEBUG=true
NODE_ENV=development
```

## 📚 Additional Resources

- **Email Setup**: See `EMAIL_SETUP.md`
- **Database Models**: Check `models/UserModel.js`
- **Middleware**: See `middleware/authMiddleware.js`
- **Controllers**: Check `controllers/authController.js`

## 🎉 What's Next?

After setting up authentication:

1. **Protect your existing routes** using the auth middleware
2. **Add role-based access** to project and ticket routes
3. **Implement user management** for admins
4. **Add session management** if needed
5. **Implement refresh tokens** for better security

The authentication system is now ready to use! 🚀
