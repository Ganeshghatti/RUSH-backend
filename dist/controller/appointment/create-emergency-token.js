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
exports.createEmergencyRoomAccessToken = void 0;
const twilio_1 = require("twilio");
const emergency_appointment_model_1 = __importDefault(require("../../models/appointment/emergency-appointment-model"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const AccessToken = twilio_1.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const createEmergencyRoomAccessToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { roomName } = req.body;
        const userId = req.user.id;
        if (!roomName) {
            res.status(400).json({ success: false, message: "Room name is required" });
            return;
        }
        // First get the user to determine their role
        const user = yield user_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        // Get the emergency appointment
        const appointment = yield emergency_appointment_model_1.default.findOne({ roomName });
        if (!appointment) {
            res.status(404).json({ success: false, message: "Emergency appointment not found" });
            return;
        }
        let isAuthorized = false;
        // Check authorization based on user role
        if (user.roles.includes('patient')) {
            const patient = yield patient_model_1.default.findById((_a = user === null || user === void 0 ? void 0 : user.roleRefs) === null || _a === void 0 ? void 0 : _a.patient);
            if (patient && appointment.patientId.toString() === patient._id.toString()) {
                isAuthorized = true;
            }
        }
        if (!isAuthorized && user.roles.includes('doctor')) {
            const doctor = yield doctor_model_1.default.findById((_b = user === null || user === void 0 ? void 0 : user.roleRefs) === null || _b === void 0 ? void 0 : _b.doctor);
            if (doctor && appointment.doctorId && appointment.doctorId.toString() === doctor._id.toString()) {
                isAuthorized = true;
            }
        }
        if (!isAuthorized) {
            res.status(403).json({
                success: false,
                message: "You are not authorized to join this emergency appointment"
            });
            return;
        }
        // Create Twilio access token
        const token = new AccessToken(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET, { identity: userId });
        const videoGrant = new VideoGrant({ room: roomName });
        token.addGrant(videoGrant);
        const jwtToken = token.toJwt();
        res.status(200).json({
            success: true,
            token: jwtToken,
            identity: userId,
            roomName,
        });
    }
    catch (err) {
        console.error("Failed to generate emergency Twilio access token:", err);
        res.status(500).json({ success: false, message: "Token generation failed" });
    }
});
exports.createEmergencyRoomAccessToken = createEmergencyRoomAccessToken;
