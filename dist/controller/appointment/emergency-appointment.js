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
exports.updateEmergencyAppointmentExpiredStatus = exports.acceptEmergencyAppointment = exports.getPatientEmergencyAppointments = exports.getAllEmergencyAppointments = exports.createEmergencyAppointment = exports.convertMediaKeysToUrls = void 0;
const emergency_appointment_model_1 = __importDefault(require("../../models/appointment/emergency-appointment-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const validation_1 = require("../../validation/validation");
const twilio_1 = __importDefault(require("twilio"));
const upload_media_1 = require("../../utils/aws_s3/upload-media");
const doctor_subscription_1 = __importDefault(require("../../models/doctor-subscription"));
const client = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// Helper function to convert media keys and profile pic to signed URLs
const convertMediaKeysToUrls = (appointments) => __awaiter(void 0, void 0, void 0, function* () {
    return Promise.all(appointments.map((appointment) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const appointmentObj = appointment.toObject();
        // Convert media keys to signed URLs
        if (appointmentObj.media && appointmentObj.media.length > 0) {
            try {
                appointmentObj.media = yield Promise.all(appointmentObj.media.map((key) => __awaiter(void 0, void 0, void 0, function* () {
                    try {
                        return yield (0, upload_media_1.GetSignedUrl)(key);
                    }
                    catch (error) {
                        console.error(`Error generating signed URL for key ${key}:`, error);
                        return key; // Return original key if URL generation fails
                    }
                })));
            }
            catch (error) {
                console.error("Error processing media URLs:", error);
            }
        }
        // Convert profile pic to signed URL
        if ((_b = (_a = appointmentObj.patientId) === null || _a === void 0 ? void 0 : _a.userId) === null || _b === void 0 ? void 0 : _b.profilePic) {
            try {
                appointmentObj.patientId.userId.profilePic = yield (0, upload_media_1.GetSignedUrl)(appointmentObj.patientId.userId.profilePic);
            }
            catch (error) {
                console.error(`Error generating signed URL for profile pic ${appointmentObj.patientId.userId.profilePic}:`, error);
                // Keep original key if URL generation fails
            }
        }
        return appointmentObj;
    })));
});
exports.convertMediaKeysToUrls = convertMediaKeysToUrls;
const createEmergencyAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validate request body
        const validationResult = validation_1.createEmergencyAppointmentSchema.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationResult.error.errors,
            });
            return;
        }
        const { title, description, media, location, contactNumber, name } = validationResult.data;
        const userId = req.user.id;
        // Find patient by userId
        const patient = yield patient_model_1.default.findOne({ userId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "Patient not found",
            });
            return;
        }
        // Check user's wallet balance
        const user = yield user_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        // Check if user has sufficient balance (2500)
        if (user.wallet < 2500) {
            res.status(400).json({
                success: false,
                message: "Insufficient wallet balance. Please add money to your wallet. Required balance: ₹2500",
                data: {
                    currentBalance: user.wallet,
                    requiredBalance: 2500,
                },
            });
            return;
        }
        // Create new emergency appointment
        const newEmergencyAppointment = new emergency_appointment_model_1.default({
            title,
            description,
            media,
            location,
            contactNumber,
            name,
            patientId: patient._id,
            status: "pending",
        });
        yield newEmergencyAppointment.save();
        // Populate the response with patient information
        const populatedAppointment = yield emergency_appointment_model_1.default.findById(newEmergencyAppointment._id).populate({
            path: "patientId",
            select: "userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode phone email profilePic",
            },
        });
        // Convert media keys to signed URLs
        const appointmentsWithUrls = yield (0, exports.convertMediaKeysToUrls)([populatedAppointment]);
        res.status(201).json({
            success: true,
            data: appointmentsWithUrls[0],
            message: "Emergency appointment created successfully",
        });
    }
    catch (error) {
        console.error("Error creating emergency appointment:", error);
        res.status(500).json({
            success: false,
            message: "Error creating emergency appointment",
            error: error.message,
        });
    }
});
exports.createEmergencyAppointment = createEmergencyAppointment;
const getAllEmergencyAppointments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find all emergency appointments with pending status
        const appointments = yield emergency_appointment_model_1.default.find({ status: "pending" })
            .populate({
            path: "patientId",
            select: "userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode phone email profilePic",
            },
        })
            .sort({ createdAt: -1 }); // Sort by newest first
        // Convert media keys to signed URLs
        const appointmentsWithUrls = yield (0, exports.convertMediaKeysToUrls)(appointments);
        res.status(200).json({
            success: true,
            data: appointmentsWithUrls,
            count: appointmentsWithUrls.length,
            message: "Emergency appointments retrieved successfully",
        });
    }
    catch (error) {
        console.error("Error getting emergency appointments:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving emergency appointments",
            error: error.message,
        });
    }
});
exports.getAllEmergencyAppointments = getAllEmergencyAppointments;
const getPatientEmergencyAppointments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Find patient by userId
        const patient = yield patient_model_1.default.findOne({ userId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "Patient not found",
            });
            return;
        }
        // Find all emergency appointments for this patient
        const appointments = yield emergency_appointment_model_1.default.find({
            patientId: patient._id,
        })
            .populate({
            path: "patientId",
            select: "userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode phone email profilePic",
            },
        })
            .sort({ createdAt: -1 }); // Sort by newest first
        // Convert media keys to signed URLs
        const appointmentsWithUrls = yield (0, exports.convertMediaKeysToUrls)(appointments);
        res.status(200).json({
            success: true,
            data: appointmentsWithUrls,
            count: appointmentsWithUrls.length,
            message: "Patient emergency appointments retrieved successfully",
        });
    }
    catch (error) {
        console.error("Error getting patient emergency appointments:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving patient emergency appointments",
            error: error.message,
        });
    }
});
exports.getPatientEmergencyAppointments = getPatientEmergencyAppointments;
const acceptEmergencyAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // Find doctor by userId
        const doctor = yield doctor_model_1.default.findOne({ userId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
            return;
        }
        // Find the emergency appointment by ID
        const emergencyAppointment = yield emergency_appointment_model_1.default.findById(id);
        if (!emergencyAppointment) {
            res.status(404).json({
                success: false,
                message: "Emergency appointment not found",
            });
            return;
        }
        // Check if appointment is already accepted
        if (emergencyAppointment.status !== "pending") {
            res.status(400).json({
                success: false,
                message: "Emergency appointment is already accepted or completed",
            });
            return;
        }
        // Find patient and check wallet balance
        const patient = yield patient_model_1.default.findById(emergencyAppointment.patientId);
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "Patient not found",
            });
            return;
        }
        const user = yield user_model_1.default.findById(patient.userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: "Patient user not found",
            });
            return;
        }
        // Check if patient has sufficient balance (2500)
        if (user.wallet < 2500) {
            res.status(400).json({
                success: false,
                message: "Patient has insufficient wallet balance",
                data: {
                    currentBalance: user.wallet,
                    requiredBalance: 2500,
                },
            });
            return;
        }
        // Create Twilio room for emergency consultation
        const roomName = `emergency_${id}`;
        console.log("Creating Twilio room with name:", roomName);
        const room = yield client.video.v1.rooms.create({
            uniqueName: roomName,
            type: "group",
            maxParticipants: 2,
        });
        // Deduct amount from patient's wallet
        user.wallet -= 2500;
        yield user.save();
        // get the current subscription
        const now = new Date();
        const activeSub = doctor.subscriptions.find((sub) => !sub.endDate || sub.endDate > now);
        if (!activeSub) {
            res.status(400).json({
                success: false,
                message: "Doctor has no active subscription",
            });
            return;
        }
        const subscription = yield doctor_subscription_1.default.findById(activeSub.SubscriptionId);
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: "Subscription not found",
            });
            return;
        }
        // Emergency appointments use normal platformFee and opsExpense fields
        let platformFee = ((_a = subscription.platformFeeEmergency) === null || _a === void 0 ? void 0 : _a.figure) || 0;
        let opsExpense = ((_b = subscription.opsExpenseEmergency) === null || _b === void 0 ? void 0 : _b.figure) || 0;
        let doctorEarning = 2500 - platformFee - (2500 * opsExpense) / 100;
        if (doctorEarning < 0)
            doctorEarning = 0;
        const doctorUser = yield user_model_1.default.findById(userId);
        if (!doctorUser) {
            res.status(404).json({ success: false, message: "Doctor user not found" });
            return;
        }
        doctorUser.wallet = (doctorUser.wallet || 0) + doctorEarning;
        yield doctorUser.save();
        doctor.earnings += doctorEarning;
        yield doctor.save();
        // Update the emergency appointment with doctor info
        emergencyAppointment.doctorId = doctor._id;
        emergencyAppointment.status = "in-progress";
        emergencyAppointment.roomName = room.uniqueName;
        yield emergencyAppointment.save();
        // Populate the response with both patient and doctor information
        const updatedAppointment = yield emergency_appointment_model_1.default.findById(id)
            .populate({
            path: "patientId",
            select: "userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode phone email profilePic",
            },
        })
            .populate({
            path: "doctorId",
            select: "userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode phone email profilePic",
            },
        });
        res.status(200).json({
            success: true,
            data: {
                appointment: updatedAppointment,
                roomName: room.uniqueName,
            },
            message: "Emergency appointment accepted successfully",
        });
    }
    catch (error) {
        console.error("Error accepting emergency appointment:", error);
        res.status(500).json({
            success: false,
            message: "Error accepting emergency appointment",
            error: error.message,
        });
    }
});
exports.acceptEmergencyAppointment = acceptEmergencyAppointment;
// Update expired clinic appointments - for cron job
const updateEmergencyAppointmentExpiredStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        // Find appointments that should be expired (end time has passed and status is still pending/confirmed)
        const expiredAppointments = yield emergency_appointment_model_1.default.updateMany({
            "createdAt": { $lt: now },
            status: { $in: ["pending", "confirmed"] },
        }, {
            $set: { status: "expired" },
        });
        console.log(`Updated ${expiredAppointments.modifiedCount} expired clinic appointments`);
    }
    catch (error) {
        console.error("Error updating expired clinic appointments:", error);
    }
});
exports.updateEmergencyAppointmentExpiredStatus = updateEmergencyAppointmentExpiredStatus;
