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
const sendResetPasswordLink = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email || !validator_1.default.isEmail(email)) {
            res
                .status(400)
                .json({ success: false, message: "Valid email is required" });
            return;
        }
        const user = yield user_model_1.default.findOne({ email });
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        const existingToken = yield reset_password_model_1.default.findOne({ email });
        if (existingToken) {
            res
                .status(400)
                .json({
                success: false,
                message: "An email reset link has already been sent to this email address. Please wait 10 minutes.",
            });
            return;
        }
        // Generate secure token
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const resetLink = `${process.env.DOMAIN_NAME}/reset-password/${token}`;
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: "Reset your RushDr password",
            html: `<p>You requested a password reset. Click the link below to reset your password:</p>
             <a href="${resetLink}">${resetLink}</a>
             <p>This link is valid for 10 minutes.</p>`,
        };
        yield email_transporter_1.transporter.sendMail(mailOptions);
        // Store token in DB
        yield reset_password_model_1.default.create({ email, token });
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
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters long",
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
        const user = yield user_model_1.default.findOne({ email: resetEntry.email });
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        const hashedPassword = yield bcrypt_1.default.hash(newPassword, 10);
        // this will update based on role pass. 
        // user.password = hashedPassword;
        yield user.save();
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
