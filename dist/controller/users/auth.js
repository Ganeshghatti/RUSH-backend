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
exports.login = exports.verifyOtp = exports.sendOtp = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const otp_model_1 = __importDefault(require("../../models/otp-model"));
const sms_1 = __importDefault(require("../../utils/aws_sns/sms"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
const sendOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone } = req.body;
        // Check if an OTP already exists for the phone number
        const existingOTP = yield otp_model_1.default.findOne({ phone });
        if (existingOTP) {
            res.status(400).json({
                success: false,
                message: "An OTP has already been sent to this phone number. Please wait 5 minutes.",
            });
            return;
        }
        // Generate new OTP
        const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
        // Save or update OTP in the database
        yield otp_model_1.default.findOneAndUpdate({ phone }, { phone, otp: newOTP }, { upsert: true, new: true });
        // Send OTP via SMS
        const message = `Your OTP is ${newOTP}. Valid for 5 minutes.`;
        const smsSent = yield (0, sms_1.default)(phone, message);
        res.status(200).json({
            success: true,
            message: "OTP sent successfully",
        });
    }
    catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({
            success: false,
            message: "Failed to send OTP",
        });
    }
});
exports.sendOtp = sendOtp;
const verifyOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { firstName, lastName, phone, otp, password, email } = req.body;
        if (!phone || !otp || !firstName || !lastName || !email || !password) {
            res.status(400).json({
                success: false,
                message: "Phone number, OTP, first name, last name, email and password are required",
            });
            return;
        }
        const otpRecord = yield otp_model_1.default.findOne({ phone });
        if (!otpRecord) {
            res.status(404).json({
                success: false,
                message: "No OTP found for this phone number",
            });
            return;
        }
        if (otpRecord.otp !== otp) {
            res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
            return;
        }
        const salt = yield bcrypt_1.default.genSalt(10);
        const hashedPassword = yield bcrypt_1.default.hash(password, salt);
        const newUser = new user_model_1.default({
            email,
            password: hashedPassword,
            role: "patient",
            phone,
            phoneVerified: true,
            firstName,
            lastName,
            countryCode: "+91",
        });
        // Save user
        yield newUser.save();
        yield otp_model_1.default.deleteOne({ _id: otpRecord._id });
        const token = jsonwebtoken_1.default.sign({
            id: newUser === null || newUser === void 0 ? void 0 : newUser._id,
            email: newUser === null || newUser === void 0 ? void 0 : newUser.email,
            role: newUser === null || newUser === void 0 ? void 0 : newUser.role,
        }, process.env.JWT_SECRET || "", { expiresIn: "24h" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: true, // Required for HTTPS
            sameSite: "none", // Required for cross-domain cookies
            maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
            path: "/", // Cookie is available for all paths
        });
        res.status(200).json({
            success: true,
            message: "OTP verified successfully",
        });
    }
    catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during OTP verification",
        });
    }
});
exports.verifyOtp = verifyOtp;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
            return;
        }
        const user = yield user_model_1.default.findOne({ email });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        const isMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
            return;
        }
        if (!JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in the environment variables");
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: true, // Required for HTTPS
            sameSite: "none", // Required for cross-domain cookies
            maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
            path: "/", // Cookie is available for all paths
        });
        res.status(200).json({
            success: true,
            message: "Login successful",
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during login",
        });
    }
});
exports.login = login;
