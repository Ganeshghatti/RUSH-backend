"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../controller/users/auth");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
// OTP-specific rate limiting with enhanced rules to prevent abuse
const otpLimiter = (0, express_rate_limit_1.default)({
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
router.route("/send-otp").post(otpLimiter, auth_1.sendOtp);
router.route("/verify-otp").post(auth_1.verifyOtp);
router.route("/login").post(auth_1.login);
exports.default = router;
