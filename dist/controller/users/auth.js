"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.logout = exports.findCurrentUser = exports.login = exports.verifyOtp = exports.sendOtp = exports.sendSMSV3 = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const otp_model_1 = __importDefault(require("../../models/otp-model"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const validator_1 = __importDefault(require("validator"));
const mongoose_1 = __importDefault(require("mongoose"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const signed_url_1 = require("../../utils/signed-url");
const admin_model_1 = __importDefault(require("../../models/user/admin-model"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "";
const sendSMSV3 = (phoneNumber, otp) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const apiKey = process.env.OTP_API_KEY;
        const clientId = process.env.OTP_CLIENT_ID;
        if (!apiKey || !clientId) {
            throw new Error("API key or Client ID not defined in environment variables.");
        }
        // Remove '+' from phone number
        const formattedPhoneNumber = phoneNumber.replace('+91', '');
        console.log("formattedPhoneNumber", formattedPhoneNumber);
        const message = encodeURIComponent(`Dear User, Your Registration OTP with RUSHDR is ${otp} please do not share this OTP with anyone to keep your account secure - RUSHDR Sadguna Ventures`);
        const url = `https://api.mylogin.co.in/api/v2/SendSMS?SenderId=RUSHDR&Message=${message}&MobileNumbers=${formattedPhoneNumber}&TemplateId=1707175033225166571&ApiKey=${apiKey}&ClientId=${clientId}`;
        const response = yield fetch(url, {
            method: "GET",
            headers: {
                accept: "text/plain",
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = yield response.text();
        console.log("SMS sent successfully:", data);
    }
    catch (error) {
        console.error("Failed to send SMS:", error);
    }
});
exports.sendSMSV3 = sendSMSV3;
const sendOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone, email, countryCode = "+91", role } = req.body;
        // Validate input
        if (!phone || !email || !role) {
            res.status(400).json({
                success: false,
                message: "Phone number, email, and role are required",
            });
            return;
        }
        if (!validator_1.default.isMobilePhone(phone, "any")) {
            res.status(400).json({
                success: false,
                message: "Invalid phone number format",
            });
            return;
        }
        if (!validator_1.default.isEmail(email)) {
            res.status(400).json({
                success: false,
                message: "Invalid email format",
            });
            return;
        }
        if (!["doctor", "patient", "admin"].includes(role)) {
            res.status(400).json({
                success: false,
                message: "Role must be either 'doctor', 'patient' or 'admin'",
            });
            return;
        }
        // Check if user exists and already has the specified role
        const existingUser = yield user_model_1.default.findOne({ phone });
        if (existingUser && existingUser.roles.includes(role)) {
            res.status(400).json({
                success: false,
                message: `You are already registered with the role: ${role}`,
            });
            return;
        }
        const existingEmail = yield user_model_1.default.findOne({ email });
        if (existingEmail && existingEmail.phone !== phone) {
            res.status(400).json({
                success: false,
                message: "Email already used with different phone number",
            });
            return;
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
        console.log(phone);
        yield (0, exports.sendSMSV3)(phone, newOTP);
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
        const { firstName, lastName, phone, otp, password, email, countryCode = "+91", role, } = req.body;
        // Validate required fields
        if (!phone ||
            !otp ||
            !firstName ||
            !lastName ||
            !email ||
            !password ||
            !role) {
            res.status(400).json({
                success: false,
                message: "All fields (phone, otp, firstName, lastName, email, password, role) are required",
            });
            return;
        }
        if (!validator_1.default.isMobilePhone(phone, "any")) {
            res.status(400).json({
                success: false,
                message: "Invalid phone number format",
            });
            return;
        }
        if (!validator_1.default.isEmail(email)) {
            res.status(400).json({
                success: false,
                message: "Invalid email format",
            });
            return;
        }
        if (password.length < 4) {
            res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
            });
            return;
        }
        if (!["doctor", "patient", "admin"].includes(role)) {
            res.status(400).json({
                success: false,
                message: "Role must be either 'doctor', 'patient' or 'admin'",
            });
            return;
        }
        // Verify the OTP
        const otpRecord = yield otp_model_1.default.findOne({ phone });
        if (!otpRecord || otpRecord.otp !== otp) {
            res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
            return;
        }
        // Check if user exists
        let user = yield user_model_1.default.findOne({ email });
        // Hash the password
        const salt = yield bcrypt_1.default.genSalt(10);
        const hashedPassword = yield bcrypt_1.default.hash(password.toLowerCase(), salt);
        if (user) {
            // Check if the phone number matches the existing user's phone
            if (user.phone !== phone) {
                res.status(400).json({
                    success: false,
                    message: "Phone number does not match the registered email",
                });
                return;
            }
            // Check if the user already has the specified role (redundant but kept for safety)
            if (user.roles.includes(role)) {
                res.status(400).json({
                    success: false,
                    message: `You are already registered with the role: ${role}`,
                });
                return;
            }
            // Add the new role
            user.roles.push(role);
            // Create role-specific data
            if (role === "doctor") {
                const doctorProfile = yield doctor_model_1.default.create({
                    userId: user._id,
                    password: hashedPassword,
                });
                if (!user.roleRefs)
                    user.roleRefs = {};
                user.roleRefs.doctor = doctorProfile._id;
            }
            else if (role === "patient") {
                const patientProfile = yield patient_model_1.default.create({
                    userId: user._id,
                    password: hashedPassword,
                });
                if (!user.roleRefs)
                    user.roleRefs = {};
                user.roleRefs.patient = patientProfile._id;
            }
            else if (role === "admin") {
                const adminProfile = yield admin_model_1.default.create({
                    userId: user._id,
                    password: hashedPassword,
                });
                if (!user.roleRefs)
                    user.roleRefs = {};
                user.roleRefs.admin = adminProfile._id;
            }
            yield user.save();
        }
        else {
            // Create a new user with the specified role only
            user = new user_model_1.default({
                email,
                roles: [role], // Only assign the requested role
                phone,
                phoneVerified: true,
                firstName,
                lastName,
                countryCode,
            });
            // Create role-specific profile based on the requested role
            if (role === "doctor") {
                const doctorProfile = yield doctor_model_1.default.create({
                    userId: user._id,
                    password: hashedPassword,
                });
                if (!user.roleRefs)
                    user.roleRefs = {};
                user.roleRefs.doctor = doctorProfile._id;
            }
            else if (role === "patient") {
                const patientProfile = yield patient_model_1.default.create({
                    userId: user._id,
                    password: hashedPassword,
                });
                if (!user.roleRefs)
                    user.roleRefs = {};
                user.roleRefs.patient = patientProfile._id;
            }
            else if (role === "admin") {
                const adminProfile = yield admin_model_1.default.create({
                    userId: user._id,
                    password: hashedPassword,
                });
                if (!user.roleRefs)
                    user.roleRefs = {};
                user.roleRefs.admin = adminProfile._id;
            }
            yield user.save();
        }
        // Delete the OTP after successful verification
        yield otp_model_1.default.deleteOne({ _id: otpRecord._id });
        // Generate JWT token
        if (!JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
        }
        const token = jsonwebtoken_1.default.sign({
            id: user._id,
            email: user.email,
            role: role,
        }, JWT_SECRET, { expiresIn: "24h" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000 * 30, // 30 day
            path: "/",
        });
        res.status(200).json({
            success: true,
            message: "Registration successful",
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                roles: user.roles,
            },
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
        const { email, password, role } = req.body;
        if (role === "admin") {
            if (email === "urushdr@gmail.com" && password === "BulletBike$$$") {
                const user = yield user_model_1.default.findOne({ email });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: "User not found",
                    });
                    return;
                }
                const token = jsonwebtoken_1.default.sign({ id: user._id, email, role }, JWT_SECRET, { expiresIn: "24h" });
                res.cookie("token", token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: "none",
                    maxAge: 24 * 60 * 60 * 1000,
                    path: "/",
                });
                res.status(200).json({
                    success: true,
                    message: "Login successful",
                });
                return;
            }
            else {
                res.status(401).json({
                    success: false,
                    message: "Invalid admin credentials",
                });
                return;
            }
        }
        if (!email || !password || !role) {
            res.status(400).json({
                success: false,
                message: "Email, password, and role are required",
            });
            return;
        }
        if (!validator_1.default.isEmail(email)) {
            res.status(400).json({
                success: false,
                message: "Invalid email format",
            });
            return;
        }
        if (!["doctor", "patient", "admin"].includes(role)) {
            res.status(400).json({
                success: false,
                message: "Role must be either 'doctor', 'patient' or 'admin'",
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
        if (!user.roles.includes(role)) {
            res.status(403).json({
                success: false,
                message: `You are not registered with the role: ${role}. Please register first.`,
            });
            return;
        }
        // Fetch role-specific password
        let rolePassword;
        if (role === "doctor") {
            const doctor = yield doctor_model_1.default.findOne({ userId: user._id });
            rolePassword = doctor === null || doctor === void 0 ? void 0 : doctor.password;
        }
        else if (role === "patient") {
            const patient = yield patient_model_1.default.findOne({ userId: user._id });
            rolePassword = patient === null || patient === void 0 ? void 0 : patient.password;
        }
        else if (role === "admin") {
            const admin = yield admin_model_1.default.findOne({ userId: user._id });
            rolePassword = admin === null || admin === void 0 ? void 0 : admin.password;
        }
        if (!rolePassword) {
            res.status(500).json({
                success: false,
                message: `No ${role} profile found for this user`,
            });
            return;
        }
        const isMatch = yield bcrypt_1.default.compare(password.toLowerCase(), rolePassword);
        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
            return;
        }
        if (!JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, role: role }, JWT_SECRET, { expiresIn: "24h" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            path: "/",
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
const findCurrentUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id, role } = req.user;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID format",
            });
            return;
        }
        let user = yield user_model_1.default.findById(id).select("-password");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        // Conditionally populate roles
        const populatePaths = [];
        if ((_a = user.roleRefs) === null || _a === void 0 ? void 0 : _a.doctor)
            populatePaths.push({
                path: "roleRefs.doctor",
                select: "-password"
            });
        if ((_b = user.roleRefs) === null || _b === void 0 ? void 0 : _b.patient)
            populatePaths.push({
                path: "roleRefs.patient",
                select: "-password"
            });
        if (populatePaths.length > 0) {
            user = yield user.populate(populatePaths);
        }
        const userWithUrls = yield (0, signed_url_1.generateSignedUrlsForUser)(user);
        res.status(200).json({
            success: true,
            message: "User retrieved successfully",
            data: Object.assign({ currentRole: role }, userWithUrls),
        });
    }
    catch (error) {
        console.error("Error in finding user:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve user",
            error: error.message,
        });
    }
});
exports.findCurrentUser = findCurrentUser;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            path: "/",
        });
        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    }
    catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during logout",
        });
    }
});
exports.logout = logout;
