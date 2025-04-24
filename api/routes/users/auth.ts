import { Router } from "express";
import { sendOtp, verifyOtp } from "../../controller/users/auth";
import rateLimit from "express-rate-limit";

const router = Router();

// OTP-specific rate limiting with enhanced rules to prevent abuse
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  limit: 3, // Allow up to 3 attempts per hour
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: "Too many OTP requests. Please try again after 1 hour.",
  skipSuccessfulRequests: false, // Count successful requests against the limit
  keyGenerator: (req) => {
    // Use both IP and phone number (from request body) to create the key
    // This prevents attackers from using multiple phone numbers from the same IP
    return `${req.ip}-${req.body.phoneNumber || "unknown"}`;
  },
});

// Apply OTP rate limiter to the send-otp route only
router.route("/send-otp").post(otpLimiter, sendOtp);
router.route("/verify-otp").post(verifyOtp);

export default router;
