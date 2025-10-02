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
exports.updateHomeVisitAppointmentExpiredStatus = exports.updateHomeVisitConfig = exports.getDoctorHomeVisitAppointmentByDate = exports.cancelHomeVisitAppointment = exports.completeHomeVisitAppointment = exports.confirmHomeVisitAppointment = exports.acceptHomeVisitRequest = exports.bookHomeVisitAppointment = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const homevisit_appointment_model_1 = __importDefault(require("../../models/appointment/homevisit-appointment-model"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const otp_utils_1 = require("../../utils/otp-utils");
const validation_1 = require("../../validation/validation");
const doctor_subscription_1 = __importDefault(require("../../models/doctor-subscription"));
// NOTE: Other controllers access req.user directly; we rely on global Express augmentation.
// Removing local AuthRequest avoids duplicated type drift.
// Distance, doctor geolocation are not required for home visit logic anymore
// Common population helper
const populateAppointment = (id) => homevisit_appointment_model_1.default.findById(id)
    .populate({
    path: "patientId",
    select: "firstName lastName countryCode gender email profilePic",
})
    .populate({
    path: "doctorId",
    select: "qualifications specialization userId homeVisit",
    populate: {
        path: "userId",
        select: "firstName lastName countryCode gender email profilePic",
    },
});
// Extract client IP (basic; respects x-forwarded-for first entry)
const getClientIp = (req) => {
    const fwd = req.headers["x-forwarded-for"] || "";
    if (fwd)
        return fwd.split(",")[0].trim();
    return req.ip || (req.socket && req.socket.remoteAddress) || undefined;
};
// Helper: compute total amount frozen in other home visit appointments for a patient
const getFrozenHomeVisitAmount = (patientId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const frozen = yield homevisit_appointment_model_1.default.aggregate([
        {
            $match: {
                patientId: new mongoose_1.default.Types.ObjectId(patientId),
                status: "patient_confirmed",
                "paymentDetails.paymentStatus": "frozen",
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: { $ifNull: ["$pricing.totalCost", 0] } },
            },
        },
    ]);
    return ((_a = frozen === null || frozen === void 0 ? void 0 : frozen[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
});
// Step 1: Patient creates home visit request with fixed cost only
const bookHomeVisitAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Validate request body against schema (mirrors clinic & other controllers pattern)
        const parsed = validation_1.homeVisitAppointmentBookSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validation error",
                errors: parsed.error.errors,
            });
            return;
        }
        const { doctorId, slot, patientAddress } = parsed.data;
        const patientId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!patientId) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        // (Field presence/shape already enforced by Zod schema)
        // Check if doctor exists and has home visit enabled
        const doctor = yield doctor_model_1.default.findById(doctorId);
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
            return;
        }
        if (!doctor.homeVisit || !doctor.homeVisit.isActive) {
            res.status(400).json({
                success: false,
                message: "Doctor does not offer home visit services",
            });
            return;
        }
        // Check if patient exists
        const patient = yield user_model_1.default.findById(patientId);
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "Patient not found",
            });
            return;
        }
        // Get fixed cost from doctor's home visit configuration
        const fixedCost = ((_b = doctor.homeVisit) === null || _b === void 0 ? void 0 : _b.fixedPrice) || 0;
        if (fixedCost <= 0) {
            res.status(400).json({
                success: false,
                message: "Doctor has not set home visit pricing",
            });
            return;
        }
        // Distance not used anymore
        // Check if the slot is already booked
        const existingAppointment = yield homevisit_appointment_model_1.default.findOne({
            doctorId,
            "slot.day": new Date(slot.day),
            "slot.time.start": new Date(slot.time.start),
            "slot.time.end": new Date(slot.time.end),
            status: { $in: ["pending", "doctor_accepted", "patient_confirmed"] },
        });
        if (existingAppointment) {
            res.status(400).json({
                success: false,
                message: "This slot is already booked",
            });
            return;
        }
        // Get patient IP (keep only patient IP and patient location for potential logistics)
        const patientIp = req.ip ||
            req.connection.remoteAddress ||
            req.headers["x-forwarded-for"];
        const patientGeo = {
            type: "Point",
            coordinates: patientAddress.location.coordinates,
        };
        // Create new appointment with only fixed cost
        const newAppointment = new homevisit_appointment_model_1.default({
            doctorId,
            patientId,
            slot: {
                day: new Date(slot.day),
                duration: slot.duration,
                time: {
                    start: new Date(slot.time.start),
                    end: new Date(slot.time.end),
                },
            },
            patientAddress: {
                line1: patientAddress.line1,
                line2: patientAddress.line2,
                landmark: patientAddress.landmark,
                locality: patientAddress.locality,
                city: patientAddress.city,
                pincode: patientAddress.pincode,
                country: patientAddress.country || "India",
                location: {
                    type: "Point",
                    coordinates: patientAddress.location.coordinates,
                },
            },
            status: "pending",
            pricing: {
                fixedCost,
                travelCost: 0,
                totalCost: fixedCost,
            },
            paymentDetails: {
                amount: fixedCost,
                walletDeducted: 0,
                paymentStatus: "pending",
            },
            patientIp,
            patientGeo,
        });
        yield newAppointment.save();
        // Populate the response
        const populatedAppointment = yield homevisit_appointment_model_1.default.findById(newAppointment._id)
            .populate({
            path: "patientId",
            select: "firstName lastName countryCode gender email profilePic",
        })
            .populate({
            path: "doctorId",
            select: "qualifications specialization userId homeVisit",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        });
        res.status(201).json({
            success: true,
            data: populatedAppointment,
            message: "Home visit request created successfully",
        });
    }
    catch (error) {
        console.error("Error booking home visit appointment:", error);
        res.status(500).json({
            success: false,
            message: "Error creating home visit request",
            error: error.message,
        });
    }
});
exports.bookHomeVisitAppointment = bookHomeVisitAppointment;
// Step 2: Doctor accepts request and adds travel cost
const acceptHomeVisitRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { appointmentId } = req.params;
        const parsed = validation_1.homeVisitAppointmentAcceptSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validation error",
                errors: parsed.error.errors,
            });
            return;
        }
        const { travelCost } = parsed.data;
        const doctorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!doctorId) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        // (travelCost validated by schema)
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
            return;
        }
        // Find the appointment
        const appointment = yield homevisit_appointment_model_1.default.findOne({
            _id: appointmentId,
            doctorId: doctor._id,
            status: "pending",
        });
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "Appointment not found or not in pending status",
            });
            return;
        }
        // Update appointment with travel cost
        if (!appointment.pricing || !appointment.paymentDetails) {
            res.status(500).json({
                success: false,
                message: "Appointment pricing or payment details not found",
            });
            return;
        }
        const totalCost = appointment.pricing.fixedCost + travelCost;
        appointment.status = "doctor_accepted";
        appointment.pricing.travelCost = travelCost;
        appointment.pricing.totalCost = totalCost;
        appointment.paymentDetails.amount = totalCost;
        // Get doctor IP only (no geolocation persisted for doctor)
        appointment.doctorIp = getClientIp(req);
        yield appointment.save();
        // Populate the response
        const updatedAppointment = yield populateAppointment(appointment._id);
        res.status(200).json({
            success: true,
            data: updatedAppointment,
            message: "Home visit request accepted with travel cost added",
        });
    }
    catch (error) {
        console.error("Error accepting home visit request:", error);
        res.status(500).json({
            success: false,
            message: "Error accepting request",
            error: error.message,
        });
    }
});
exports.acceptHomeVisitRequest = acceptHomeVisitRequest;
// Step 3: Patient confirms and pays total cost (frozen in wallet)
const confirmHomeVisitAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { appointmentId } = req.params;
        // No body fields to validate here besides param; schema for confirm not needed (retained symmetry)
        const patientId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!patientId) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        // Find the appointment
        const appointment = yield homevisit_appointment_model_1.default.findOne({
            _id: appointmentId,
            patientId,
            status: "doctor_accepted",
        });
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "Appointment not found or not in correct status",
            });
            return;
        }
        // Check patient wallet balance
        const patient = yield user_model_1.default.findById(patientId);
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "Patient not found",
            });
            return;
        }
        const totalCost = ((_b = appointment.pricing) === null || _b === void 0 ? void 0 : _b.totalCost) || 0;
        const frozenAmount = yield getFrozenHomeVisitAmount(patientId);
        const availableBalance = (patient.wallet || 0) - frozenAmount;
        if (availableBalance < totalCost) {
            res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
                data: {
                    required: totalCost,
                    available: availableBalance,
                    totalWallet: patient.wallet,
                },
            });
            return;
        }
        // Check pricing and payment details exist
        if (!appointment.pricing || !appointment.paymentDetails) {
            res.status(500).json({
                success: false,
                message: "Appointment pricing or payment details not found",
            });
            return;
        }
        // Mark amount as frozen logically only; do not deduct wallet or increment frozen in DB
        // We'll enforce frozen checks at spend-time and not expose it in models/UI.
        // Generate OTP
        const otpCode = (0, otp_utils_1.generateOTP)();
        // Update appointment
        appointment.status = "patient_confirmed";
        appointment.paymentDetails.walletDeducted = 0; // no deduction yet
        appointment.paymentDetails.paymentStatus = "frozen";
        appointment.otp = {
            code: otpCode,
            generatedAt: new Date(),
            attempts: 0,
            maxAttempts: 3,
            isUsed: false,
        };
        yield appointment.save();
        // Populate the response
        const confirmedAppointment = yield populateAppointment(appointment._id);
        res.status(200).json({
            success: true,
            data: confirmedAppointment,
            message: "Home visit appointment confirmed and payment frozen",
        });
    }
    catch (error) {
        console.error("Error confirming home visit appointment:", error);
        res.status(500).json({
            success: false,
            message: "Error confirming appointment",
            error: error.message,
        });
    }
});
exports.confirmHomeVisitAppointment = confirmHomeVisitAppointment;
// Step 4: Doctor completes appointment with OTP validation
const completeHomeVisitAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { appointmentId } = req.params;
        const parsed = validation_1.homeVisitAppointmentCompleteSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validation error",
                errors: parsed.error.errors,
            });
            return;
        }
        const { otp } = parsed.data;
        const doctorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!doctorId) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        if (!otp) {
            res.status(400).json({
                success: false,
                message: "OTP is required",
            });
            return;
        }
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
            return;
        }
        // Find the appointment
        const appointment = yield homevisit_appointment_model_1.default.findOne({
            _id: appointmentId,
            doctorId: doctor._id,
            status: "patient_confirmed",
        });
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "Appointment not found or not in confirmed status",
            });
            return;
        }
        // Validate OTP
        if (!appointment.otp || appointment.otp.isUsed) {
            res.status(400).json({
                success: false,
                message: "OTP is not available or already used",
            });
            return;
        }
        // No OTP expiry check; OTP is permanent for this appointment
        if ((0, otp_utils_1.isMaxAttemptsReached)(appointment.otp.attempts, appointment.otp.maxAttempts)) {
            res.status(400).json({
                success: false,
                message: "Maximum OTP attempts exceeded",
            });
            return;
        }
        if (appointment.otp.code !== otp) {
            appointment.otp.attempts += 1;
            yield appointment.save();
            res.status(400).json({
                success: false,
                message: "Invalid OTP",
                attemptsRemaining: appointment.otp.maxAttempts - appointment.otp.attempts,
            });
            return;
        }
        // OTP is valid, complete the appointment
        appointment.status = "completed";
        appointment.otp.isUsed = true;
        if (appointment.paymentDetails) {
            appointment.paymentDetails.paymentStatus = "completed";
            appointment.paymentDetails.walletDeducted =
                ((_b = appointment.pricing) === null || _b === void 0 ? void 0 : _b.totalCost) || 0;
        }
        yield appointment.save();
        // Perform actual wallet deduction at completion time
        const patient = yield user_model_1.default.findById(appointment.patientId);
        if (patient && appointment.paymentDetails) {
            const amountToDeduct = appointment.paymentDetails.walletDeducted || 0;
            if ((patient.wallet || 0) < amountToDeduct) {
                // If insufficient at completion, mark failed state and revert appointment to doctor_accepted
                appointment.status = "doctor_accepted";
                appointment.paymentDetails.paymentStatus = "pending";
                appointment.paymentDetails.walletDeducted = 0;
                appointment.otp.isUsed = false;
                yield appointment.save();
                res.status(400).json({
                    success: false,
                    message: "Insufficient wallet at completion. Please ensure funds are available.",
                });
                return;
            }
            patient.wallet = (patient.wallet || 0) - amountToDeduct;
            yield patient.save();
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
            // Home visit appointments use normal platformFee and opsExpense fields
            let platformFee = ((_c = subscription.platformFeeHomeVisit) === null || _c === void 0 ? void 0 : _c.figure) || 0;
            let opsExpense = ((_d = subscription.opsExpenseHomeVisit) === null || _d === void 0 ? void 0 : _d.figure) || 0;
            let doctorEarning = amountToDeduct - platformFee - (amountToDeduct * opsExpense) / 100;
            if (doctorEarning < 0)
                doctorEarning = 0;
            const doctorUser = yield user_model_1.default.findById(doctor.userId);
            if (!doctorUser) {
                res.status(404).json({ success: false, message: "Doctor user not found" });
                return;
            }
            doctorUser.wallet = (doctorUser.wallet || 0) + doctorEarning;
            yield doctorUser.save();
            doctor.earnings += doctorEarning;
            yield doctor.save();
        }
        // Populate the response
        const completedAppointment = yield populateAppointment(appointment._id);
        res.status(200).json({
            success: true,
            data: completedAppointment,
            message: "Home visit appointment completed successfully",
        });
    }
    catch (error) {
        console.error("Error completing home visit appointment:", error);
        res.status(500).json({
            success: false,
            message: "Error completing appointment",
            error: error.message,
        });
    }
});
exports.completeHomeVisitAppointment = completeHomeVisitAppointment;
// Cancel appointment (by patient or doctor)
const cancelHomeVisitAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { appointmentId } = req.params;
        const parsed = validation_1.homeVisitAppointmentCancelSchema.safeParse(req.body || {});
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validation error",
                errors: parsed.error.errors,
            });
            return;
        }
        // reason currently unused (no persistence field) – intentionally ignored to avoid lint warning
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        // Find the appointment
        const appointment = yield homevisit_appointment_model_1.default.findById(appointmentId);
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "Appointment not found",
            });
            return;
        }
        // Check if user is patient or doctor of this appointment
        const doctor = yield doctor_model_1.default.findOne({ userId });
        const isDoctor = doctor && doctor._id.toString() === appointment.doctorId.toString();
        const isPatient = appointment.patientId.toString() === userId;
        if (!isDoctor && !isPatient) {
            res.status(403).json({
                success: false,
                message: "Not authorized to cancel this appointment",
            });
            return;
        }
        // Check if appointment can be cancelled
        if (appointment.status === "completed" ||
            appointment.status === "cancelled") {
            res.status(400).json({
                success: false,
                message: "Cannot cancel completed or already cancelled appointment",
            });
            return;
        }
        // No refund handling required since we didn't deduct wallet on confirm
        // Update appointment status
        appointment.status = "cancelled";
        if (appointment.paymentDetails) {
            appointment.paymentDetails.paymentStatus = "failed";
            appointment.paymentDetails.walletDeducted = 0;
        }
        yield appointment.save();
        // Populate the response
        const cancelledAppointment = yield populateAppointment(appointment._id);
        res.status(200).json({
            success: true,
            data: cancelledAppointment,
            message: "Home visit appointment cancelled successfully",
        });
    }
    catch (error) {
        console.error("Error cancelling home visit appointment:", error);
        res.status(500).json({
            success: false,
            message: "Error cancelling appointment",
            error: error.message,
        });
    }
});
exports.cancelHomeVisitAppointment = cancelHomeVisitAppointment;
// Get doctor appointments by date
const getDoctorHomeVisitAppointmentByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { date } = req.body;
        const doctorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!doctorId) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        if (!date) {
            res.status(400).json({
                success: false,
                message: "Date is required",
            });
            return;
        }
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
            return;
        }
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        const appointments = yield homevisit_appointment_model_1.default.find({
            doctorId: doctor._id,
            "slot.day": {
                $gte: startDate,
                $lte: endDate,
            },
        })
            .populate({
            path: "patientId",
            select: "firstName lastName countryCode gender email profilePic",
        })
            .populate({
            path: "doctorId",
            select: "qualifications specialization userId homeVisit",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        })
            .sort({ "slot.time.start": 1 });
        res.status(200).json({
            success: true,
            data: appointments,
            message: "Doctor home visit appointments for the date retrieved successfully",
        });
    }
    catch (error) {
        console.error("Error getting doctor home visit appointments by date:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving appointments",
            error: error.message,
        });
    }
});
exports.getDoctorHomeVisitAppointmentByDate = getDoctorHomeVisitAppointmentByDate;
// Update home visit configuration for doctor
const updateHomeVisitConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const doctorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const parsed = validation_1.homeVisitConfigUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validation error",
                errors: parsed.error.errors,
            });
            return;
        }
        const { isActive, fixedPrice, availability, location } = parsed.data;
        if (!doctorId) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
            return;
        }
        // Update home visit configuration
        if (isActive !== undefined && doctor.homeVisit) {
            doctor.homeVisit.isActive = isActive;
        }
        if (fixedPrice !== undefined && doctor.homeVisit) {
            doctor.homeVisit.fixedPrice = fixedPrice;
        }
        if (availability && doctor.homeVisit) {
            // Cast because Mongoose DocumentArray typing may differ from plain parsed array
            doctor.homeVisit.availability = availability;
        }
        if (location && location.coordinates && doctor.homeVisit) {
            doctor.homeVisit.location = {
                type: "Point",
                coordinates: location.coordinates,
            };
        }
        if (doctor.homeVisit) {
            doctor.homeVisit.updatedAt = new Date();
        }
        yield doctor.save();
        res.status(200).json({
            success: true,
            data: doctor.homeVisit,
            message: "Home visit configuration updated successfully",
        });
    }
    catch (error) {
        console.error("Error updating home visit configuration:", error);
        res.status(500).json({
            success: false,
            message: "Error updating configuration",
            error: error.message,
        });
    }
});
exports.updateHomeVisitConfig = updateHomeVisitConfig;
// Cron function to update expired appointments
const updateHomeVisitAppointmentExpiredStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        // Find appointments that should be expired
        const expiredAppointments = yield homevisit_appointment_model_1.default.find({
            status: { $in: ["pending", "doctor_accepted", "patient_confirmed"] },
            "slot.time.end": { $lt: now },
        });
        for (const appointment of expiredAppointments) {
            appointment.status = "expired";
            if (appointment.paymentDetails) {
                appointment.paymentDetails.paymentStatus = "failed";
                appointment.paymentDetails.walletDeducted = 0;
            }
            yield appointment.save();
        }
        console.log(`Updated ${expiredAppointments.length} expired home visit appointments`);
    }
    catch (error) {
        console.error("Error updating expired home visit appointments:", error);
    }
});
exports.updateHomeVisitAppointmentExpiredStatus = updateHomeVisitAppointmentExpiredStatus;
