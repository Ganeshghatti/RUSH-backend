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
const validator_1 = __importDefault(require("validator"));
const JWT_SECRET = process.env.JWT_SECRET;
const sendOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone, email, password, countryCode = "+91" } = req.body;
        // Validate input
        if (!phone || !email || !password) {
            res.status(400).json({
                success: false,
                message: "Phone number, email, and password are required",
            });
            return;
        }
        if (!validator_1.default.isMobilePhone(phone, 'any')) {
            res.status(400).json({
                success: false,
                message: "Invalid phone number format",
            });
            return;
        }
        // If email is provided, validate it
        if (email && !validator_1.default.isEmail(email)) {
            res.status(400).json({
                success: false,
                message: "Invalid email format",
            });
            return;
        }
        // If password is provided, validate its strength
        if (password) {
            if (!validator_1.default.isStrongPassword(password, {
                minLength: 8,
                minLowercase: 1,
                minUppercase: 1,
                minNumbers: 1,
                minSymbols: 0
            })) {
                res.status(400).json({
                    success: false,
                    message: "Password must be at least 8 characters and include uppercase, lowercase, and numbers",
                });
                return;
            }
        }
        // Check if user with this phone already exists
        const existingUserByPhone = yield user_model_1.default.findOne({ phone });
        if (existingUserByPhone) {
            res.status(400).json({
                success: false,
                message: "User with this phone number already exists",
            });
            return;
        }
        // Check if user with this email already exists (if email provided)
        if (email) {
            const existingUserByEmail = yield user_model_1.default.findOne({ email });
            if (existingUserByEmail) {
                res.status(400).json({
                    success: false,
                    message: "User with this email already exists",
                });
                return;
            }
        }
        // Check if an OTP already exists for the phone number
        const existingOTP = yield otp_model_1.default.findOne({ phone });
        if (existingOTP) {
            res.status(400).json({
                success: false,
                message: "An OTP has already been sent to this phone number. Please wait 5 minutes.",
            });
            return;
        }
        // Generate new OTP - 6 digits
        const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
        // Save or update OTP in the database
        yield otp_model_1.default.findOneAndUpdate({ phone }, { phone, otp: newOTP }, { upsert: true, new: true });
        // Format the phone number with country code if not already included
        const formattedPhone = phone.startsWith('+') ? phone : `${countryCode}${phone}`;
        // Send OTP via SMS
        const message = `Your RUSH verification code is ${newOTP}. Valid for 5 minutes.`;
        yield (0, sms_1.default)(formattedPhone, message);
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
        const { firstName, lastName, phone, otp, password, email, countryCode = "+91" } = req.body;
        // Validate required fields
        if (!phone || !otp) {
            res.status(400).json({
                success: false,
                message: "Phone number and OTP are required",
            });
            return;
        }
        // Validate phone number
        if (!validator_1.default.isMobilePhone(phone, 'any')) {
            res.status(400).json({
                success: false,
                message: "Invalid phone number format",
            });
            return;
        }
        // For registration, validate additional fields
        if (!firstName || !lastName || !email || !password) {
            res.status(400).json({
                success: false,
                message: "First name, last name, email, and password are required for registration",
            });
            return;
        }
        // Validate email
        if (!validator_1.default.isEmail(email)) {
            res.status(400).json({
                success: false,
                message: "Invalid email format",
            });
            return;
        }
        // Check if user already exists
        const existingUser = yield user_model_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: "User with this email already exists",
            });
            return;
        }
        // Verify the OTP
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
        // Hash the password
        const salt = yield bcrypt_1.default.genSalt(10);
        const hashedPassword = yield bcrypt_1.default.hash(password, salt);
        // Create a new user
        const newUser = new user_model_1.default({
            email,
            password: hashedPassword,
            role: "patient",
            phone,
            phoneVerified: true,
            firstName,
            lastName,
            countryCode,
        });
        // Save user
        yield newUser.save();
        // Delete the OTP after successful verification
        yield otp_model_1.default.deleteOne({ _id: otpRecord._id });
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            id: newUser === null || newUser === void 0 ? void 0 : newUser._id,
            email: newUser === null || newUser === void 0 ? void 0 : newUser.email,
            role: newUser === null || newUser === void 0 ? void 0 : newUser.role,
        }, process.env.JWT_SECRET || "", { expiresIn: "24h" });
        // Set cookie with token
        res.cookie("token", token, {
            httpOnly: true,
            secure: true, // Required for HTTPS
            sameSite: "none", // Required for cross-domain cookies
            maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
            path: "/", // Cookie is available for all paths
        });
        res.status(200).json({
            success: true,
            message: "Registration successful",
            user: {
                id: newUser._id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                phone: newUser.phone,
            }
        });
    }
    catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during OTP verification",
            error: error instanceof Error ? error.message : String(error),
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
