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
exports.updateHomeStatusCron = exports.updateHomeVisitConfig = exports.getDoctorHomeVisitAppointmentByDate = exports.completeHomeVisitAppointment = exports.confirmHomeVisitAppointment = exports.acceptHomeVisitRequest = exports.bookHomeVisitAppointment = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const homevisit_appointment_model_1 = __importDefault(require("../../models/appointment/homevisit-appointment-model"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
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
    select: "userId",
    populate: {
        path: "userId",
        select: "firstName lastName countryCode gender email profilePic",
    },
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
/* Step 1: Patient creates home visit request with fixed cost only */
const bookHomeVisitAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Validate request body against schema (mirrors clinic & other controllers pattern)
        const parsed = validation_1.homeVisitAppointmentBookSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Please review the home visit request details and try again.",
                action: "bookHomeVisitAppointment:validation-error",
                data: {
                    errors: parsed.error.errors,
                },
            });
            return;
        }
        const { doctorId, slot, patientAddress } = parsed.data;
        const patientUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!patientUserId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to request a home visit.",
                action: "bookHomeVisitAppointment:not-authenticated",
            });
            return;
        }
        const patientUserDetail = yield user_model_1.default.findById(patientUserId);
        if (!patientUserDetail) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient's user profile.",
                action: "bookHomeVisitAppointment:patientUser-not-found",
            });
            return;
        }
        // Check if doctor exists and has home visit enabled
        const doctor = yield doctor_model_1.default.findById(doctorId);
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find the selected doctor.",
                action: "bookHomeVisitAppointment:doctor-not-found",
            });
            return;
        }
        if (!doctor.homeVisit || !doctor.homeVisit.isActive) {
            res.status(400).json({
                success: false,
                message: "This doctor does not offer home visit services.",
                action: "bookHomeVisitAppointment:home-visit-disabled",
            });
            return;
        }
        // Check if patient exists
        const patient = yield patient_model_1.default.findOne({ userId: patientUserId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "bookHomeVisitAppointment:patient-not-found",
            });
            return;
        }
        const patientId = patient._id;
        // Get fixed cost from doctor's home visit configuration
        const fixedCost = ((_b = doctor.homeVisit) === null || _b === void 0 ? void 0 : _b.fixedPrice) || 0;
        if (fixedCost <= 0) {
            res.status(400).json({
                success: false,
                message: "The doctor has not set home visit pricing.",
                action: "bookHomeVisitAppointment:no-pricing",
            });
            return;
        }
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
                message: "This slot is already booked.",
                action: "bookHomeVisitAppointment:slot-unavailable",
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
        // check if patient user profile have fixed cost in available balance, if yes freeze it
        const availableBalance = patientUserDetail.getAvailableBalance();
        if (availableBalance < fixedCost) {
            res.status(400).json({
                success: false,
                message: "Your wallet balance is too low to send request for this appointment.",
                action: "bookHomeVisitAppointment:insufficient-balance",
                data: {
                    required: fixedCost,
                    available: availableBalance,
                    totalWallet: patientUserDetail.wallet,
                    frozenAmount: patientUserDetail.frozenAmount,
                },
            });
            return;
        }
        const freezeSuccess = patientUserDetail.freezeAmount(fixedCost);
        if (!freezeSuccess) {
            res.status(400).json({
                success: false,
                message: "We couldn't freeze the amount.",
                action: "bookHomeVisitAppointment:freeze-failed",
                data: {
                    required: fixedCost,
                    available: patientUserDetail.wallet - patientUserDetail.frozenAmount,
                    totalWallet: patientUserDetail.wallet,
                },
            });
        }
        yield patientUserDetail.save();
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
                patientWalletDeducted: 0,
                patientWalletFrozen: fixedCost,
                paymentStatus: "pending",
            },
            patientIp,
            patientGeo,
        });
        yield newAppointment.save();
        // Populate the response
        const populatedAppointment = populateAppointment(newAppointment._id);
        res.status(201).json({
            success: true,
            message: "Home visit request created successfully.",
            action: "bookHomeVisitAppointment:success",
            data: populatedAppointment,
        });
    }
    catch (error) {
        console.error("Error booking home visit appointment:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't create the home visit request.",
            action: error.message,
        });
    }
});
exports.bookHomeVisitAppointment = bookHomeVisitAppointment;
/* Step 2: Doctor accepts request and adds travel cost */
const acceptHomeVisitRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { appointmentId } = req.params;
        const parsed = validation_1.homeVisitAppointmentAcceptSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Please review the request details and try again.",
                action: "acceptHomeVisitRequest:validation-error",
                data: {
                    errors: parsed.error.errors,
                },
            });
            return;
        }
        const { travelCost } = parsed.data;
        const doctorUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!doctorUserId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to accept requests.",
                action: "acceptHomeVisitRequest:not-authenticated",
            });
            return;
        }
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorUserId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "acceptHomeVisitRequest:doctor-not-found",
            });
            return;
        }
        const doctorId = doctor._id;
        // Find the appointment
        const appointment = yield homevisit_appointment_model_1.default.findOne({
            _id: appointmentId,
            doctorId,
            status: "pending",
        });
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "We couldn't find a pending appointment to accept.",
                action: "acceptHomeVisitRequest:appointment-not-found",
            });
            return;
        }
        // Update appointment with travel cost
        if (!appointment.pricing || !appointment.paymentDetails) {
            res.status(500).json({
                success: false,
                message: "Appointment pricing or payment details are missing.",
                action: "acceptHomeVisitRequest:pricing-missing",
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
            message: "Home visit request accepted and travel cost added.",
            action: "acceptHomeVisitRequest:success",
            data: updatedAppointment,
        });
    }
    catch (error) {
        console.error("Error accepting home visit request:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't accept the home visit request.",
            action: error.message,
        });
    }
});
exports.acceptHomeVisitRequest = acceptHomeVisitRequest;
/* Step 3: Patient confirms the appointment and totalCost=fixedCost+travelCost frozen in wallet */
const confirmHomeVisitAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { appointmentId } = req.params;
        // No body fields to validate here besides param; schema for confirm not needed (retained symmetry)
        const patientUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!patientUserId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to confirm this appointment.",
                action: "confirmHomeVisitAppointment:not-authenticated",
            });
            return;
        }
        const patient = yield patient_model_1.default.findOne({ userId: patientUserId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "confirmHomeVisitAppointment:patient-not-found",
            });
            return;
        }
        const patientId = patient._id;
        // Find the appointment
        const appointment = yield homevisit_appointment_model_1.default.findOne({
            _id: appointmentId,
            patientId,
            status: "doctor_accepted",
        });
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "We couldn't find the appointment to confirm.",
                action: "confirmHomeVisitAppointment:appointment-not-found",
            });
            return;
        }
        // Check pricing and payment details exist
        if (!appointment.pricing || !appointment.paymentDetails) {
            res.status(500).json({
                success: false,
                message: "Appointment pricing or payment details are missing.",
                action: "confirmHomeVisitAppointment:pricing-missing",
            });
            return;
        }
        const fixedCost = ((_b = appointment.pricing) === null || _b === void 0 ? void 0 : _b.fixedCost) || 0;
        const travelCost = ((_c = appointment.pricing) === null || _c === void 0 ? void 0 : _c.travelCost) || 0;
        const totalCost = ((_d = appointment.pricing) === null || _d === void 0 ? void 0 : _d.totalCost) || 0;
        // find patient's user details
        const patientUserDetail = yield user_model_1.default.findById(patientUserId);
        if (!patientUserDetail) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient's user profile.",
                action: "confirmHomeVisitAppointment:patientUser-not-found",
            });
            return;
        }
        //***** Check wallet balance - getAvailableBalance excludes frozen amount from wallet *****\\
        const availableBalance = patientUserDetail.getAvailableBalance();
        if (availableBalance < travelCost) {
            res.status(400).json({
                success: false,
                message: "Your wallet balance is too low to confirm this appointment.",
                action: "confirmHomeVisitAppointment:insufficient-balance",
                data: {
                    required: travelCost,
                    available: availableBalance,
                    totalWallet: patientUserDetail.wallet,
                    frozenAmount: patientUserDetail.frozenAmount || 0,
                },
            });
            return;
        }
        const freezeSuccess = patientUserDetail.freezeAmount(travelCost);
        if (!freezeSuccess) {
            res.status(400).json({
                success: false,
                message: "We couldn't reserve the appointment amount.",
                action: "confirmHomeVisitAppointment:freeze-failed",
                data: {
                    required: travelCost,
                    available: patientUserDetail.wallet - patientUserDetail.frozenAmount,
                    totalWallet: patientUserDetail.wallet,
                },
            });
        }
        yield patientUserDetail.save();
        // Generate OTP
        const otpCode = (0, otp_utils_1.generateOTP)();
        // Update appointment
        appointment.status = "patient_confirmed";
        appointment.paymentDetails.patientWalletDeducted = 0;
        appointment.paymentDetails.patientWalletFrozen = totalCost;
        appointment.paymentDetails.paymentStatus = "pending";
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
            message: "Home visit appointment confirmed and payment reserved.",
            action: "confirmHomeVisitAppointment:success",
            data: confirmedAppointment,
        });
    }
    catch (error) {
        console.error("Error confirming home visit appointment:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't confirm the home visit appointment.",
            action: error.message,
        });
    }
});
exports.confirmHomeVisitAppointment = confirmHomeVisitAppointment;
/* Step 4: Doctor completes appointment with OTP validation */
const completeHomeVisitAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { appointmentId } = req.params;
        const parsed = validation_1.homeVisitAppointmentCompleteSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Please review the completion details and try again.",
                action: "completeHomeVisitAppointment:validation-error",
                data: {
                    errors: parsed.error.errors,
                },
            });
            return;
        }
        const { otp } = parsed.data;
        if (!otp) {
            res.status(400).json({
                success: false,
                message: "OTP is required.",
                action: "completeHomeVisitAppointment:missing-otp",
            });
            return;
        }
        const doctorUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!doctorUserId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to complete this appointment.",
                action: "completeHomeVisitAppointment:not-authenticated",
            });
            return;
        }
        // Find doctor user detail to increment amount in the doctor user wallet
        const doctorUserDetail = yield user_model_1.default.findById(doctorUserId);
        if (!doctorUserDetail) {
            res.status(401).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "completeHomeVisitAppointment:doctor-user-not-found",
            });
            return;
        }
        // find doctor
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorUserId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "completeHomeVisitAppointment:doctor-not-found",
            });
            return;
        }
        //***** Find doctor subscription to get info of the tax deduction *****\\
        const now = new Date();
        const activeSub = doctor.subscriptions.find((sub) => !sub.endDate || sub.endDate > now);
        if (!activeSub) {
            res.status(400).json({
                success: false,
                message: "The doctor does not have an active subscription.",
                action: "completeHomeVisitAppointment:no-active-subscription",
            });
            return;
        }
        const subscription = yield doctor_subscription_1.default.findById(activeSub.SubscriptionId);
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: "We couldn't find the associated subscription.",
                action: "completeHomeVisitAppointment:subscription-not-found",
            });
            return;
        }
        let platformFee = ((_b = subscription === null || subscription === void 0 ? void 0 : subscription.platformFeeHomeVisit) === null || _b === void 0 ? void 0 : _b.figure) || 0;
        let opsExpense = ((_c = subscription === null || subscription === void 0 ? void 0 : subscription.opsExpenseHomeVisit) === null || _c === void 0 ? void 0 : _c.figure) || 0;
        // Find the appointment
        const appointment = yield homevisit_appointment_model_1.default.findOne({
            _id: appointmentId,
            doctorId: doctor._id,
            status: "patient_confirmed",
        });
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "We couldn't find a confirmed appointment to complete.",
                action: "completeHomeVisitAppointment:appointment-not-found",
            });
            return;
        }
        // Validate OTP
        if (!appointment.otp || appointment.otp.isUsed) {
            res.status(400).json({
                success: false,
                message: "The OTP is not available or has already been used.",
                action: "completeHomeVisitAppointment:otp-unavailable",
            });
            return;
        }
        if ((0, otp_utils_1.isMaxAttemptsReached)(appointment.otp.attempts, appointment.otp.maxAttempts)) {
            res.status(400).json({
                success: false,
                message: "Maximum OTP attempts exceeded.",
                action: "completeHomeVisitAppointment:max-attempts",
            });
            return;
        }
        if (appointment.otp.code !== otp) {
            appointment.otp.attempts += 1;
            yield appointment.save();
            res.status(400).json({
                success: false,
                message: "Invalid OTP.",
                action: "completeHomeVisitAppointment:otp-mismatch",
                data: {
                    attemptsRemaining: appointment.otp.maxAttempts - appointment.otp.attempts,
                },
            });
            return;
        }
        // OTP is valid, complete the appointment
        appointment.status = "completed";
        appointment.otp.isUsed = true;
        //***** convert frozen amount to actual deduction *****\\
        if (((_d = appointment.paymentDetails) === null || _d === void 0 ? void 0 : _d.paymentStatus) === "pending") {
            const patientUserDetail = yield user_model_1.default.findOne({
                "roleRefs.patient": appointment.patientId,
            });
            if (!patientUserDetail) {
                res.status(400).json({
                    success: false,
                    message: "We couldn't find the patient profile.",
                    action: "completeHomeVisitAppointment:patient-not-found",
                });
                return;
            }
            const deductAmount = appointment.paymentDetails.amount;
            // Deduct from frozen amount using helper method - (deduct from user.frozenAmount + deduct from user.wallet)
            const deductSuccess = patientUserDetail.deductFrozenAmount(deductAmount);
            if (deductSuccess && deductAmount) {
                yield patientUserDetail.save();
                appointment.paymentDetails.patientWalletDeducted = deductAmount;
                if (appointment.paymentDetails.patientWalletFrozen) {
                    appointment.paymentDetails.patientWalletFrozen -= deductAmount;
                }
                appointment.paymentDetails.paymentStatus = "completed";
                // increment in doctor user
                let incrementAmount = deductAmount - platformFee - (deductAmount * opsExpense) / 100;
                if (incrementAmount < 0)
                    incrementAmount = 0;
                doctorUserDetail.wallet += incrementAmount;
                yield doctorUserDetail.save();
            }
            else {
                res.status(500).json({
                    success: false,
                    message: "We couldn't process the final payment.",
                    action: "completeHomeVisitAppointment:wallet-deduction-failed",
                });
                return;
            }
        }
        yield appointment.save();
        // Populate the response
        const completedAppointment = yield populateAppointment(appointment._id);
        res.status(200).json({
            success: true,
            message: "Home visit appointment completed successfully and payment processed.",
            action: "completeHomeVisitAppointment:success",
            data: completedAppointment,
        });
    }
    catch (error) {
        console.error("Error completing home visit appointment:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't complete the home visit appointment.",
            action: error.message,
        });
    }
});
exports.completeHomeVisitAppointment = completeHomeVisitAppointment;
// Cancel appointment (by patient or doctor)
// export const cancelHomeVisitAppointment = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { appointmentId } = req.params;
//     const parsed = homeVisitAppointmentCancelSchema.safeParse(req.body || {});
//     if (!parsed.success) {
//       res.status(400).json({
//         success: false,
//         message: "Please review the cancellation details and try again.",
//         action: "cancelHomeVisitAppointment:validation-error",
//         data: {
//           errors: parsed.error.errors,
//         },
//       });
//       return;
//     }
//     // reason currently unused (no persistence field) – intentionally ignored to avoid lint warning
//     const userId = (req as any).user?.id;
//     if (!userId) {
//       res.status(401).json({
//         success: false,
//         message: "You must be signed in to cancel this appointment.",
//         action: "cancelHomeVisitAppointment:not-authenticated",
//       });
//       return;
//     }
//     // Find the appointment
//     const appointment = await HomeVisitAppointment.findById(appointmentId);
//     if (!appointment) {
//       res.status(404).json({
//         success: false,
//         message: "We couldn't find that appointment.",
//         action: "cancelHomeVisitAppointment:appointment-not-found",
//       });
//       return;
//     }
//     // Check if user is patient or doctor of this appointment
//     const doctor = await Doctor.findOne({ userId });
//     const isDoctor =
//       doctor && doctor._id.toString() === appointment.doctorId.toString();
//     const patient = await Patient.findOne({ userId });
//     const isPatient =
//       patient && patient._id.toString() === appointment.patientId.toString();
//     if (!isDoctor && !isPatient) {
//       res.status(403).json({
//         success: false,
//         message: "You are not authorised to cancel this appointment.",
//         action: "cancelHomeVisitAppointment:unauthorised",
//       });
//       return;
//     }
//     // Check if appointment can be cancelled
//     if (
//       appointment.status === "completed" ||
//       appointment.status === "doctor_rejected" ||
//       appointment.status === "patient_cancelled"
//     ) {
//       res.status(400).json({
//         success: false,
//         message: "This appointment is already completed or cancelled.",
//         action: "cancelHomeVisitAppointment:invalid-status",
//       });
//       return;
//     }
//     // No refund handling required since we didn't deduct wallet on confirm
//     // Update appointment status
//     appointment.status = "cancelled";
//     if (appointment.paymentDetails) {
//       appointment.paymentDetails.paymentStatus = "failed";
//       appointment.paymentDetails.walletDeducted = 0;
//     }
//     await appointment.save();
//     // Populate the response
//     const cancelledAppointment = await populateAppointment(appointment._id);
//     res.status(200).json({
//       success: true,
//       message: "Home visit appointment cancelled successfully.",
//       action: "cancelHomeVisitAppointment:success",
//       data: cancelledAppointment,
//     });
//   } catch (error: any) {
//     console.error("Error cancelling home visit appointment:", error);
//     res.status(500).json({
//       success: false,
//       message: "We couldn't cancel the home visit appointment.",
//       action: error.message,
//     });
//   }
// };
// Get doctor appointments by date
const getDoctorHomeVisitAppointmentByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { date } = req.body;
        const doctorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!doctorId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to view these appointments.",
                action: "getDoctorHomeVisitAppointmentByDate:not-authenticated",
            });
            return;
        }
        if (!date) {
            res.status(400).json({
                success: false,
                message: "Date is required.",
                action: "getDoctorHomeVisitAppointmentByDate:missing-date",
            });
            return;
        }
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "getDoctorHomeVisitAppointmentByDate:doctor-not-found",
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
            message: "Doctor home visit appointments for the date retrieved successfully.",
            action: "getDoctorHomeVisitAppointmentByDate:success",
            data: appointments,
        });
    }
    catch (error) {
        console.error("Error getting doctor home visit appointments by date:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load home visit appointments for that date.",
            action: error.message,
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
                message: "Please review the configuration details and try again.",
                action: "updateHomeVisitConfig:validation-error",
                data: {
                    errors: parsed.error.errors,
                },
            });
            return;
        }
        const { isActive, fixedPrice, availability, location } = parsed.data;
        if (!doctorId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to update home visit settings.",
                action: "updateHomeVisitConfig:not-authenticated",
            });
            return;
        }
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "updateHomeVisitConfig:doctor-not-found",
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
            message: "Home visit configuration updated successfully.",
            action: "updateHomeVisitConfig:success",
            data: doctor.homeVisit,
        });
    }
    catch (error) {
        console.error("Error updating home visit configuration:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't update the home visit configuration.",
            action: error.message,
        });
    }
});
exports.updateHomeVisitConfig = updateHomeVisitConfig;
//***** script for cron job
const updateHomeStatusCron = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const appointments = yield homevisit_appointment_model_1.default.find({
            "slot.time.end": { $lt: now },
            status: { $in: ["pending", "doctor_accepted", "patient_confirmed"] },
        });
        if (appointments.length === 0) {
            return {
                success: true,
                message: "No home appointments to update.",
                summary: { expired: 0, completed: 0, unattended: 0 },
            };
        }
        let expired = 0;
        let completed = 0;
        let unattended = 0;
        // loop through all the appointments
        for (const appt of appointments) {
            const { status, paymentDetails, patientId } = appt;
            if (!status || !paymentDetails || !patientId) {
                console.warn("Skipping appointment due to missing fields:", appt._id);
                continue;
            }
            const patientUserDetail = yield user_model_1.default.findOne({
                "roleRefs.patient": patientId,
            });
            if (!patientUserDetail) {
                console.warn("Patient user not found for appointment:", appt._id);
                continue;
            }
            // pending, doctor_accepted -> expired
            if (status === "pending" || status === "doctor_accepted") {
                appt.status = "expired";
                const unFreezeSuccess = patientUserDetail.unfreezeAmount(paymentDetails === null || paymentDetails === void 0 ? void 0 : paymentDetails.patientWalletFrozen);
                if (!unFreezeSuccess) {
                    console.warn("Unfreeze failed for appointment:", appt._id);
                    continue;
                }
                yield patientUserDetail.save();
                if (appt.paymentDetails) {
                    appt.paymentDetails.patientWalletFrozen = 0;
                }
                expired++;
            }
            // patient_confirmed → completed or unattended
            else if (status === "patient_confirmed") {
                if ((paymentDetails === null || paymentDetails === void 0 ? void 0 : paymentDetails.paymentStatus) === "completed") {
                    appt.status = "completed";
                    completed++;
                }
                else {
                    appt.status = "unattended";
                    const unFreezeSuccess = patientUserDetail.unfreezeAmount(paymentDetails === null || paymentDetails === void 0 ? void 0 : paymentDetails.patientWalletFrozen);
                    if (!unFreezeSuccess) {
                        console.warn("Unfreeze failed for appointment:", appt._id);
                        continue;
                    }
                    yield patientUserDetail.save();
                    if (appt.paymentDetails) {
                        appt.paymentDetails.patientWalletFrozen = 0;
                    }
                    unattended++;
                }
            }
            yield appt.save();
        }
        return {
            success: true,
            message: "Home Statuses updated.",
            summary: { expired, completed, unattended },
        };
    }
    catch (error) {
        console.error("Cron job error in updateHomeStatusCron:", error);
        return {
            success: false,
            message: "Cron job failed to update home appointments.",
            error: error.message,
        };
    }
});
exports.updateHomeStatusCron = updateHomeStatusCron;
