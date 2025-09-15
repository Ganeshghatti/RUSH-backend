"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.sendResetPasswordLink = void 0;
const email_transporter_1 = require("./../../config/email-transporter");
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const validator_1 = __importDefault(require("validator"));
const reset_password_model_1 = __importDefault(require("../../models/reset-password-model"));
const crypto_1 = __importDefault(require("crypto"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const sendResetPasswordLink = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { role, email } = req.body;
        if (!email || !validator_1.default.isEmail(email) || !role) {
            res
                .status(400)
                .json({ success: false, message: "Valid email and role are required" });
            return;
        }
        const user = yield user_model_1.default.findOne({ email });
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        if (!user.roles.includes(role)) {
            res.status(400).json({
                success: false,
                message: `You do not have the role: ${role}`,
            });
            return;
        }
        // Check for existing token and its expiry
        const existingToken = yield reset_password_model_1.default.findOne({ email, role });
        if (existingToken) {
            const now = Date.now();
            const createdAt = new Date(existingToken.createdAt).getTime();
            if (now - createdAt < 10 * 60 * 1000) {
                res.status(400).json({
                    success: false,
                    message: "An email reset link has already been sent to this email address. Please wait 10 minutes.",
                });
                return;
            }
            else {
                // Token expired, delete it so a new one can be created
                yield reset_password_model_1.default.deleteOne({ _id: existingToken._id });
            }
        }
        // Generate secure token
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const resetLink = `${process.env.DOMAIN_NAME}/reset-password/${token}`;
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: "Reset your RUSHDR password",
            html: `
        <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
          <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px;">
            <h2 style="color: #1a73e8; margin-bottom: 16px;">Reset your RUSHDR password</h2>
            <p style="font-size: 15px; color: #333;">
              You requested a password reset. Click the button below to reset your password:
            </p>
            <a href="${resetLink}" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #1a73e8; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Reset Password
            </a>
            <p style="font-size: 13px; color: #666;">
              Or copy and paste this link into your browser:<br>
              <span style="word-break: break-all; color: #1a73e8;">${resetLink}</span>
            </p>
            <p style="font-size: 13px; color: #888;">
              This link is valid for <b>10 minutes</b>.
            </p>
            <hr style="margin: 32px 0;">
            <p style="font-size: 12px; color: #bbb;">
              If you did not request this, you can safely ignore this email.<br>
              &copy; ${new Date().getFullYear()} RUSHDR
            </p>
          </div>
        </div>
      `,
        };
        yield email_transporter_1.transporter.sendMail(mailOptions);
        // Store token in DB
        yield reset_password_model_1.default.create({ email, role, token });
        res.status(200).json({
            success: true,
            message: "Password reset link sent to your email",
        });
    }
    catch (error) {
        console.error("Error sending reset link:", error);
        res.status(500).json({
            success: false,
            message: "Server error while sending reset link",
        });
    }
});
exports.sendResetPasswordLink = sendResetPasswordLink;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.params;
        const { newPassword, role } = req.body;
        if (!token || !role) {
            res
                .status(400)
                .json({ success: false, message: "Token and role are required" });
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
            return;
        }
        const resetEntry = yield reset_password_model_1.default.findOne({ token });
        if (!resetEntry) {
            res
                .status(400)
                .json({ success: false, message: "Invalid or expired reset token" });
            return;
        }
        // Check if token is expired (10 minutes = 600,000 ms)
        const now = Date.now();
        const createdAt = new Date(resetEntry.createdAt).getTime();
        if (now - createdAt > 10 * 60 * 1000) {
            // Optionally, delete the expired token
            yield reset_password_model_1.default.deleteOne({ token });
            res.status(400).json({
                success: false,
                message: "Reset token has expired. Please request a new link.",
            });
            return;
        }
        const user = yield user_model_1.default.findOne({ email: resetEntry.email });
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        if (resetEntry.role !== role) {
            res.status(400).json({
                success: false,
                message: `You do not have the role: ${role}`,
            });
            return;
        }
        if (role === "doctor") {
            const doctor = yield doctor_model_1.default.findOne({ userId: user._id });
            if (!doctor) {
                res
                    .status(404)
                    .json({ success: false, message: "Doctor profile not found" });
                return;
            }
            const salt = yield bcrypt_1.default.genSalt(10);
            const hashedPassword = yield bcrypt_1.default.hash(newPassword.toLowerCase(), salt);
            doctor.password = hashedPassword;
            yield doctor.save();
        }
        else if (role === "patient") {
            const patient = yield patient_model_1.default.findOne({ userId: user._id });
            if (!patient) {
                res
                    .status(404)
                    .json({ success: false, message: "Patient profile not found" });
                return;
            }
            const salt = yield bcrypt_1.default.genSalt(10);
            const hashedPassword = yield bcrypt_1.default.hash(newPassword.toLowerCase(), salt);
            patient.password = hashedPassword;
            yield patient.save();
        }
        else {
            res.status(400).json({ success: false, message: "Invalid role" });
            return;
        }
        // Delete token after use
        yield reset_password_model_1.default.deleteOne({ token });
        res.status(200).json({
            success: true,
            message: "Password reset successful",
        });
    }
    catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({
            success: false,
            message: "Server error while resetting password",
        });
    }
});
exports.resetPassword = resetPassword;
