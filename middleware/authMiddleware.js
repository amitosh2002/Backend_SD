import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";

// Verify JWT token middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account is deactivated",
      });
    }

    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// Role-based access control middleware
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

// Require admin role
export const requireAdmin = requireRole(["admin"]);

// Require manager or admin role
export const requireManager = requireRole(["admin", "manager"]);

// Require verified user
export const requireVerified = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Account verification required",
      });
    }

    next();
  } catch (error) {
    console.error("Verification middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Verification check failed",
    });
  }
};

// Optional authentication middleware (for routes that can work with or without auth)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key"
        );
        const user = await User.findById(decoded.userId);

        if (user && user.isActive) {
          req.user = decoded;
        }
      } catch (error) {
        // Token is invalid, but we continue without authentication
        console.log("Optional auth: Invalid token, continuing as guest");
      }
    }

    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    next(); // Continue even if there's an error
  }
};

// Rate limiting middleware for OTP requests
export const otpRateLimit = (() => {
  const attempts = new Map();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 3; // Max 3 OTP requests per minute

  // Clean up expired attempts periodically
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, attemptData] of attempts.entries()) {
      if (now > attemptData.resetTime) {
        attempts.delete(ip);
      }
    }
  }, 5 * 60 * 1000); // Clean up every 5 minutes

  // Clear interval when process exits
  process.on("SIGINT", () => {
    clearInterval(cleanupInterval);
  });

  process.on("SIGTERM", () => {
    clearInterval(cleanupInterval);
  });

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!attempts.has(ip)) {
      attempts.set(ip, { count: 1, resetTime: now + windowMs });
    } else {
      const attemptData = attempts.get(ip);

      if (now > attemptData.resetTime) {
        // Reset window
        attemptData.count = 1;
        attemptData.resetTime = now + windowMs;
      } else if (attemptData.count >= maxAttempts) {
        return res.status(429).json({
          success: false,
          message:
            "Too many OTP requests. Please wait before requesting another.",
        });
      } else {
        attemptData.count++;
      }
    }

    next();
  };
})();
