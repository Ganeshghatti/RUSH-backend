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
exports.updateClinicAppointmentExpiredStatus = exports.validateVisitOTP = exports.getAppointmentOTP = exports.getDoctorClinicAppointments = exports.getPatientClinicAppointments = exports.cancelClinicAppointment = exports.confirmClinicAppointment = exports.bookClinicAppointment = exports.getDoctorClinicAvailability = exports.updateClinicDetails = void 0;
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const clinic_appointment_model_1 = __importDefault(require("../../models/appointment/clinic-appointment-model"));
const validation_1 = require("../../validation/validation");
const mongoose_1 = __importDefault(require("mongoose"));
const otp_utils_1 = require("../../utils/otp-utils");
const doctor_subscription_1 = __importDefault(require("../../models/doctor-subscription"));
// Helper function to populate clinic details from doctor's embedded clinics
const populateClinicDetails = (appointments, doctor) => {
    return appointments.map((appointment) => {
        const clinicVisit = doctor.clinicVisit;
        const clinic = ((clinicVisit === null || clinicVisit === void 0 ? void 0 : clinicVisit.clinics) || []).find((c) => c._id.toString() === appointment.clinicId);
        return Object.assign(Object.assign({}, appointment.toObject()), { clinicDetails: clinic
                ? {
                    clinicName: clinic.clinicName,
                    address: clinic.address,
                    consultationFee: clinic.consultationFee,
                    frontDeskNumber: clinic.frontDeskNumber,
                    operationalDays: clinic.operationalDays,
                    timeSlots: clinic.timeSlots,
                    isActive: clinic.isActive,
                }
                : null });
    });
};
// Add clinic to doctor's profile
// export const addClinic = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const validation = clinicCreateSchema.safeParse(req.body);
//     if (!validation.success) {
//       res.status(400).json({
//         success: false,
//         message: "Validation error",
//         errors: validation.error.errors,
//       });
//       return;
//     }
//     const doctorId = req.user?.id;
//     if (!doctorId) {
//       res.status(401).json({
//         success: false,
//         message: "User not authenticated",
//       });
//       return;
//     }
//     // Find doctor by userId
//     const doctor = await Doctor.findOne({ userId: doctorId });
//     if (!doctor) {
//       res.status(404).json({
//         success: false,
//         message: "Doctor profile not found",
//       });
//       return;
//     }
//     const clinicData = {
//       ...validation.data,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };
//     // Add clinic using mongoose push method
//     (doctor.clinicVisit as any).clinics.push(clinicData);
//     (doctor.clinicVisit as any).isActive = true;
//     await doctor.save();
//     res.status(201).json({
//       success: true,
//       message: "Clinic added successfully",
//       data: {
//         clinic: clinicData,
//       },
//     });
//   } catch (error) {
//     console.error("Error adding clinic:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };
// Get all clinics for a doctor
// export const getDoctorClinics = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const doctorId = req.user?.id;
//     if (!doctorId) {
//       res.status(401).json({
//         success: false,
//         message: "User not authenticated",
//       });
//       return;
//     }
//     const doctor = await Doctor.findOne({ userId: doctorId }).select(
//       "clinicVisit"
//     );
//     if (!doctor) {
//       res.status(404).json({
//         success: false,
//         message: "Doctor profile not found",
//       });
//       return;
//     }
//     const clinicVisit = doctor.clinicVisit as any;
//     res.status(200).json({
//       success: true,
//       message: "Clinics retrieved successfully",
//       data: {
//         clinics: clinicVisit?.clinics || [],
//         isActive: clinicVisit?.isActive || false,
//       },
//     });
//   } catch (error) {
//     console.error("Error retrieving clinics:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };
// Update clinic details
// export const updateClinic = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { clinicId } = req.params;
//     const validation = clinicUpdateSchema.safeParse(req.body);
//     if (!validation.success) {
//       res.status(400).json({
//         success: false,
//         message: "Validation error",
//         errors: validation.error.errors,
//       });
//       return;
//     }
//     const doctorId = req.user?.id;
//     if (!doctorId) {
//       res.status(401).json({
//         success: false,
//         message: "User not authenticated",
//       });
//       return;
//     }
//     const doctor = await Doctor.findOne({ userId: doctorId });
//     if (!doctor) {
//       res.status(404).json({
//         success: false,
//         message: "Doctor profile not found",
//       });
//       return;
//     }
//     const clinicVisit = doctor.clinicVisit as any;
//     const clinics = clinicVisit?.clinics || [];
//     // Find and update the specific clinic
//     const clinicIndex = clinics.findIndex(
//       (clinic: any) => clinic._id.toString() === clinicId
//     );
//     if (clinicIndex === -1) {
//       res.status(404).json({
//         success: false,
//         message: "Clinic not found",
//       });
//       return;
//     }
//     // Update clinic data
//     Object.assign(clinics[clinicIndex], {
//       ...validation.data,
//       updatedAt: new Date(),
//     });
//     await doctor.save();
//     res.status(200).json({
//       success: true,
//       message: "Clinic updated successfully",
//       data: {
//         clinic: clinics[clinicIndex],
//       },
//     });
//   } catch (error) {
//     console.error("Error updating clinic:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };
// Delete clinic
// export const deleteClinic = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { clinicId } = req.params;
//     const doctorId = req.user?.id;
//     if (!doctorId) {
//       res.status(401).json({
//         success: false,
//         message: "User not authenticated",
//       });
//       return;
//     }
//     const doctor = await Doctor.findOne({ userId: doctorId });
//     if (!doctor) {
//       res.status(404).json({
//         success: false,
//         message: "Doctor profile not found",
//       });
//       return;
//     }
//     const clinicVisit = doctor.clinicVisit as any;
//     const clinics = clinicVisit?.clinics || [];
//     const initialLength = clinics.length;
//     // Remove clinic using pull method
//     (doctor.clinicVisit as any).clinics.pull({ _id: clinicId });
//     if ((doctor.clinicVisit as any).clinics.length === initialLength) {
//       res.status(404).json({
//         success: false,
//         message: "Clinic not found",
//       });
//       return;
//     }
//     // If no clinics left, deactivate clinic visits
//     if ((doctor.clinicVisit as any).clinics.length === 0) {
//       (doctor.clinicVisit as any).isActive = false;
//     }
//     await doctor.save();
//     res.status(200).json({
//       success: true,
//       message: "Clinic deleted successfully",
//     });
//   } catch (error) {
//     console.error("Error deleting clinic:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };
// single function to add, update and delete a clinic by doctor
const updateClinicDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const validation = validation_1.clinicPatchRequestSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Please review the clinic details and try again.",
                action: "updateClinicDetails:validation-error",
                data: {
                    errors: validation.error.errors,
                },
            });
            return;
        }
        const doctorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!doctorId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to update clinic details.",
                action: "updateClinicDetails:not-authenticated",
            });
            return;
        }
        const validatedData = validation.data;
        if (Object.keys(validatedData).length === 0) {
            res.status(400).json({
                success: false,
                message: "Please provide fields to update.",
                action: "updateClinicDetails:no-fields",
            });
            return;
        }
        const updateQuery = {};
        if (validatedData.clinics !== undefined) {
            // Fetch doctor to get active subscription
            const doctor = yield doctor_model_1.default.findOne({ userId: doctorId }).select("subscriptions");
            if (!doctor) {
                res.status(404).json({
                    success: false,
                    message: "We couldn't find your doctor profile.",
                    action: "updateClinicDetails:doctor-not-found",
                });
                return;
            }
            // Find the latest/active subscription (assuming last is active)
            const activeSub = doctor.subscriptions && doctor.subscriptions.length > 0 ? doctor.subscriptions[doctor.subscriptions.length - 1] : null;
            if (!activeSub || !activeSub.SubscriptionId) {
                res.status(400).json({
                    success: false,
                    message: "No active subscription found. Please subscribe to a plan.",
                    action: "updateClinicDetails:no-active-subscription",
                });
                return;
            }
            // Fetch DoctorSubscription to get no_of_clinics
            const subDoc = yield doctor_subscription_1.default.findById(activeSub.SubscriptionId);
            if (!subDoc) {
                res.status(400).json({
                    success: false,
                    message: "We couldn't find the associated subscription plan.",
                    action: "updateClinicDetails:subscription-not-found",
                });
                return;
            }
            const maxClinics = subDoc.no_of_clinics || 0;
            if (Array.isArray(validatedData.clinics) && validatedData.clinics.length > maxClinics) {
                res.status(400).json({
                    success: false,
                    message: `Your subscription allows only ${maxClinics} clinics. Upgrade your plan to add more clinics.`,
                    action: "updateClinicDetails:clinic-limit",
                });
                return;
            }
            updateQuery["clinicVisit.clinics"] = validatedData.clinics;
        }
        if (validatedData.isActive !== undefined) {
            updateQuery["clinicVisit.isActive"] = validatedData.isActive;
        }
        const updatedDoctor = yield doctor_model_1.default.findOneAndUpdate({ userId: doctorId }, { $set: updateQuery }, { new: true, select: "clinicVisit" });
        if (!updatedDoctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "updateClinicDetails:doctor-not-found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Clinic details updated successfully.",
            action: "updateClinicDetails:success",
            data: updatedDoctor.clinicVisit,
        });
    }
    catch (err) {
        console.error("Error patching clinic details:", err);
        res.status(500).json({
            success: false,
            message: "We couldn't update the clinic details.",
            action: err instanceof Error ? err.message : String(err),
        });
    }
});
exports.updateClinicDetails = updateClinicDetails;
// Get doctor's clinic availability for patients
const getDoctorClinicAvailability = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { doctorId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(doctorId)) {
            res.status(400).json({
                success: false,
                message: "The doctor ID provided is invalid.",
                action: "getDoctorClinicAvailability:invalid-id",
            });
            return;
        }
        const doctor = yield doctor_model_1.default.findById(doctorId)
            .populate("userId", "firstName lastName profilePic")
            .select("clinicVisit specialization");
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that doctor.",
                action: "getDoctorClinicAvailability:doctor-not-found",
            });
            return;
        }
        const clinicVisit = doctor.clinicVisit;
        if (!(clinicVisit === null || clinicVisit === void 0 ? void 0 : clinicVisit.isActive)) {
            res.status(404).json({
                success: false,
                message: "This doctor does not offer clinic visits.",
                action: "getDoctorClinicAvailability:no-active-clinic",
            });
            return;
        }
        // Filter only active clinics
        const activeClinics = ((clinicVisit === null || clinicVisit === void 0 ? void 0 : clinicVisit.clinics) || []).filter((clinic) => clinic.isActive);
        res.status(200).json({
            success: true,
            message: "Doctor clinic availability retrieved successfully.",
            action: "getDoctorClinicAvailability:success",
            data: {
                doctor: {
                    _id: doctor._id,
                    user: doctor.userId,
                    specialization: doctor.specialization,
                },
                clinics: activeClinics,
            },
        });
    }
    catch (error) {
        console.error("Error retrieving doctor clinic availability:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load the clinic availability.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getDoctorClinicAvailability = getDoctorClinicAvailability;
// Book clinic appointment by patient + freeze amount
const bookClinicAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const validation = validation_1.clinicAppointmentBookSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Please review the clinic appointment details and try again.",
                action: "bookClinicAppointment:validation-error",
                data: {
                    errors: validation.error.errors,
                },
            });
            return;
        }
        const { doctorId, clinicId, slot } = validation.data;
        // we get userId of the patient from the middelware
        const patientUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!patientUserId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to book a clinic appointment.",
                action: "bookClinicAppointment:not-authenticated",
            });
            return;
        }
        //***** Validate doctor *****\\
        const doctor = yield doctor_model_1.default.findById(doctorId);
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find the selected doctor.",
                action: "bookClinicAppointment:doctor-not-found",
            });
            return;
        }
        //***** Validate clinic *****\\
        const clinicVisit = doctor.clinicVisit;
        const clinic = ((clinicVisit === null || clinicVisit === void 0 ? void 0 : clinicVisit.clinics) || []).find((c) => c._id.toString() === clinicId && c.isActive);
        if (!clinic) {
            res.status(404).json({
                success: false,
                message: "We couldn't find an active clinic for that doctor.",
                action: "bookClinicAppointment:clinic-not-found",
            });
            return;
        }
        //***** Get Patient User details for wallet check *****\\
        const patientUserDetail = yield user_model_1.default.findById(patientUserId);
        if (!patientUserDetail) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "bookClinicAppointment:patient-not-found",
            });
            return;
        }
        //***** Check wallet balance - getAvailableBalance excludes frozen amount from wallet *****\\
        const availableBalance = patientUserDetail.getAvailableBalance();
        if (availableBalance < clinic.consultationFee) {
            res.status(400).json({
                success: false,
                message: "Your wallet balance is too low for this appointment.",
                action: "bookClinicAppointment:insufficient-balance",
                data: {
                    required: clinic.consultationFee,
                    available: availableBalance,
                    totalWallet: patientUserDetail.wallet,
                    frozenAmount: patientUserDetail.frozenAmount || 0,
                },
            });
            return;
        }
        // Parse slot dates
        const appointmentDay = new Date(slot.day);
        const startTime = new Date(slot.time.start);
        const endTime = new Date(slot.time.end);
        // Check for conflicting appointments
        const conflictingAppointment = yield clinic_appointment_model_1.default.findOne({
            doctorId: doctor._id,
            clinicId: clinicId,
            "slot.day": appointmentDay,
            "slot.time.start": { $lt: endTime },
            "slot.time.end": { $gt: startTime },
            status: { $in: ["pending", "confirmed"] },
        });
        if (conflictingAppointment) {
            res.status(400).json({
                success: false,
                message: "This clinic slot is already booked.",
                action: "bookClinicAppointment:slot-unavailable",
            });
            return;
        }
        // Freeze amount from patient's user wallet -> unfreeze it if this appointment cancelled.
        patientUserDetail.frozenAmount += clinic.consultationFee;
        yield patientUserDetail.save();
        // Create appointment
        const appointment = new clinic_appointment_model_1.default({
            doctorId: doctor._id,
            patientId: patientUserId,
            clinicId: clinicId,
            slot: {
                day: appointmentDay,
                duration: slot.duration,
                time: {
                    start: startTime,
                    end: endTime,
                },
            },
            status: "pending",
            paymentDetails: {
                amount: clinic.consultationFee,
                patientWalletDeducted: 0,
                patientWalletFrozen: clinic.consultationFee,
                paymentStatus: "pending",
            },
        });
        yield appointment.save();
        res.status(201).json({
            success: true,
            message: "Clinic appointment booked successfully.",
            action: "bookClinicAppointment:success",
            data: {
                appointment,
                patientWalletFrozen: clinic.consultationFee,
                patientAvailableBalance: patientUserDetail.getAvailableBalance(),
                note: "Amount will be deducted from the wallet once the appointment is completed.",
            },
        });
    }
    catch (error) {
        console.error("Error booking clinic appointment:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't book the clinic appointment.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.bookClinicAppointment = bookClinicAppointment;
// Confirm clinic appointment by Doctor + generate otp
const confirmClinicAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { appointmentId } = req.params;
        const doctorUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!doctorUserId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to confirm appointments.",
                action: "confirmClinicAppointment:not-authenticated",
            });
            return;
        }
        //***** Find doctor by their userId *****\\
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorUserId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "confirmClinicAppointment:doctor-not-found",
            });
            return;
        }
        //***** Find appointment *****\\
        const appointment = yield clinic_appointment_model_1.default.findOne({
            _id: appointmentId,
            doctorId: doctor._id,
        });
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that appointment.",
                action: "confirmClinicAppointment:appointment-not-found",
            });
            return;
        }
        if (appointment.status !== "pending") {
            res.status(400).json({
                success: false,
                message: "Only pending appointments can be confirmed.",
                action: "confirmClinicAppointment:invalid-status",
            });
            return;
        }
        // Update appointment status to confirmed and generate OTP
        appointment.status = "confirmed";
        appointment.otp = {
            code: (0, otp_utils_1.generateOTP)(),
            generatedAt: new Date(),
            expiresAt: (0, otp_utils_1.getOTPExpirationTime)(),
            attempts: 0,
            maxAttempts: 3,
            isUsed: false,
        };
        yield appointment.save();
        res.status(200).json({
            success: true,
            message: "Appointment confirmed successfully.",
            action: "confirmClinicAppointment:success",
            data: {
                appointmentId: appointment._id,
                status: appointment.status,
                otpGenerated: true,
                paymentStatus: (_b = appointment.paymentDetails) === null || _b === void 0 ? void 0 : _b.paymentStatus,
                patientWalletDeducted: (_c = appointment.paymentDetails) === null || _c === void 0 ? void 0 : _c.patientWalletDeducted,
                patientAmountFrozen: (_d = appointment.paymentDetails) === null || _d === void 0 ? void 0 : _d.patientWalletFrozen,
            },
        });
    }
    catch (error) {
        console.error("Error confirming clinic appointment:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't confirm the clinic appointment.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.confirmClinicAppointment = confirmClinicAppointment;
// Cancel/Reject clinic appointment (Doctor only)
const cancelClinicAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { appointmentId } = req.params;
        const doctorUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!doctorUserId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to cancel appointments.",
                action: "cancelClinicAppointment:not-authenticated",
            });
            return;
        }
        // Find doctor by userId
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorUserId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "cancelClinicAppointment:doctor-not-found",
            });
            return;
        }
        // Find appointment
        const appointment = yield clinic_appointment_model_1.default.findOne({
            _id: appointmentId,
            doctorId: doctor._id,
        });
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that appointment.",
                action: "cancelClinicAppointment:appointment-not-found",
            });
            return;
        }
        if (appointment.status === "completed" ||
            appointment.status === "cancelled") {
            res.status(400).json({
                success: false,
                message: "This appointment is already completed or cancelled.",
                action: "cancelClinicAppointment:invalid-status",
            });
            return;
        }
        // Handle refunds based on payment status
        let refundAmount = 0;
        if (((_b = appointment.paymentDetails) === null || _b === void 0 ? void 0 : _b.patientWalletDeducted) &&
            appointment.paymentDetails.patientWalletDeducted > 0) {
            const patient = yield user_model_1.default.findById(appointment.patientId);
            if (patient) {
                refundAmount = appointment.paymentDetails.patientWalletDeducted;
                if (appointment.paymentDetails.paymentStatus === "pending") {
                    // If amount was frozen, unfreeze it using helper method
                    patient.unfreezeAmount(refundAmount);
                }
                else if (appointment.paymentDetails.paymentStatus === "completed") {
                    // If amount was already deducted, refund to wallet
                    patient.wallet += refundAmount;
                }
                yield patient.save();
            }
        }
        // Update appointment status to cancelled
        appointment.status = "cancelled";
        // Note: Cancellation reason removed since history field is removed
        yield appointment.save();
        res.status(200).json({
            success: true,
            message: "Appointment cancelled successfully.",
            action: "cancelClinicAppointment:success",
            data: {
                appointmentId: appointment._id,
                status: appointment.status,
                refunded: refundAmount,
                refundType: ((_c = appointment.paymentDetails) === null || _c === void 0 ? void 0 : _c.paymentStatus) === "frozen"
                    ? "unfrozen"
                    : "refunded",
            },
        });
    }
    catch (error) {
        console.error("Error cancelling clinic appointment:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't cancel the clinic appointment.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.cancelClinicAppointment = cancelClinicAppointment;
// Get patient's clinic appointments
const getPatientClinicAppointments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const patientId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!patientId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to view clinic appointments.",
                action: "getPatientClinicAppointments:not-authenticated",
            });
            return;
        }
        const appointments = yield clinic_appointment_model_1.default.find({ patientId })
            .populate("doctorId", "userId specialization clinicVisit")
            .populate({
            path: "doctorId",
            populate: {
                path: "userId",
                select: "firstName lastName profilePic",
            },
        })
            .sort({ "slot.day": -1 });
        // Populate clinic details from embedded clinics
        const appointmentsWithClinicDetails = appointments.map((appointment) => {
            const doctor = appointment.doctorId;
            const clinicVisit = doctor === null || doctor === void 0 ? void 0 : doctor.clinicVisit;
            const clinic = ((clinicVisit === null || clinicVisit === void 0 ? void 0 : clinicVisit.clinics) || []).find((c) => c._id.toString() === appointment.clinicId);
            return Object.assign(Object.assign({}, appointment.toObject()), { clinicDetails: clinic
                    ? {
                        clinicName: clinic.clinicName,
                        address: clinic.address,
                        consultationFee: clinic.consultationFee,
                        frontDeskNumber: clinic.frontDeskNumber,
                        operationalDays: clinic.operationalDays,
                        timeSlots: clinic.timeSlots,
                        isActive: clinic.isActive,
                    }
                    : null });
        });
        res.status(200).json({
            success: true,
            message: "Patient clinic appointments retrieved successfully.",
            action: "getPatientClinicAppointments:success",
            data: {
                appointments: appointmentsWithClinicDetails,
            },
        });
    }
    catch (error) {
        console.error("Error retrieving patient clinic appointments:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load the patient's clinic appointments.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getPatientClinicAppointments = getPatientClinicAppointments;
// Get doctor's clinic appointments
const getDoctorClinicAppointments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const doctorUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!doctorUserId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to view clinic appointments.",
                action: "getDoctorClinicAppointments:not-authenticated",
            });
            return;
        }
        // Find doctor by userId
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorUserId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "getDoctorClinicAppointments:doctor-not-found",
            });
            return;
        }
        const appointments = yield clinic_appointment_model_1.default.find({ doctorId: doctor._id })
            .populate("patientId", "firstName lastName profilePic phone")
            .sort({ "slot.day": -1 });
        // Populate clinic details from embedded clinics
        const appointmentsWithClinicDetails = appointments.map((appointment) => {
            const clinicVisit = doctor.clinicVisit;
            const clinic = ((clinicVisit === null || clinicVisit === void 0 ? void 0 : clinicVisit.clinics) || []).find((c) => c._id.toString() === appointment.clinicId);
            return Object.assign(Object.assign({}, appointment.toObject()), { clinicDetails: clinic
                    ? {
                        clinicName: clinic.clinicName,
                        address: clinic.address,
                        consultationFee: clinic.consultationFee,
                        frontDeskNumber: clinic.frontDeskNumber,
                        operationalDays: clinic.operationalDays,
                        timeSlots: clinic.timeSlots,
                        isActive: clinic.isActive,
                    }
                    : null });
        });
        res.status(200).json({
            success: true,
            message: "Doctor clinic appointments retrieved successfully.",
            action: "getDoctorClinicAppointments:success",
            data: {
                appointments: appointmentsWithClinicDetails,
            },
        });
    }
    catch (error) {
        console.error("Error retrieving doctor clinic appointments:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load the doctor clinic appointments.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getDoctorClinicAppointments = getDoctorClinicAppointments;
// Generate or retrieve OTP for appointment
const getAppointmentOTP = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { appointmentId } = req.params;
        const patientId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!patientId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to view the OTP.",
                action: "getAppointmentOTP:not-authenticated",
            });
            return;
        }
        const appointment = yield clinic_appointment_model_1.default.findOne({
            _id: appointmentId,
            patientId: patientId,
        });
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that appointment.",
                action: "getAppointmentOTP:appointment-not-found",
            });
            return;
        }
        if (appointment.status !== "confirmed") {
            res.status(400).json({
                success: false,
                message: "OTP is only available for confirmed appointments.",
                action: "getAppointmentOTP:invalid-status",
            });
            return;
        }
        const otpData = appointment.otp;
        // Check if OTP exists (should exist as it's generated during confirmation)
        if (!(otpData === null || otpData === void 0 ? void 0 : otpData.code)) {
            res.status(400).json({
                success: false,
                message: "No OTP was generated for this appointment.",
                action: "getAppointmentOTP:otp-missing",
            });
            return;
        }
        // Check if OTP has expired
        if ((otpData === null || otpData === void 0 ? void 0 : otpData.expiresAt) && (0, otp_utils_1.isOTPExpired)(otpData.expiresAt)) {
            res.status(400).json({
                success: false,
                message: "This OTP has expired. Please contact your doctor.",
                action: "getAppointmentOTP:otp-expired",
            });
            return;
        }
        // Check if OTP is already used
        if (otpData === null || otpData === void 0 ? void 0 : otpData.isUsed) {
            res.status(400).json({
                success: false,
                message: "This OTP has already been used.",
                action: "getAppointmentOTP:otp-used",
            });
            return;
        }
        const updatedOtpData = appointment.otp;
        res.status(200).json({
            success: true,
            message: "OTP retrieved successfully.",
            action: "getAppointmentOTP:success",
            data: {
                otp: updatedOtpData === null || updatedOtpData === void 0 ? void 0 : updatedOtpData.code,
                expiresAt: updatedOtpData === null || updatedOtpData === void 0 ? void 0 : updatedOtpData.expiresAt,
            },
        });
    }
    catch (error) {
        console.error("Error generating appointment OTP:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't retrieve the appointment OTP.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getAppointmentOTP = getAppointmentOTP;
// Validate OTP and complete appointment
const validateVisitOTP = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const validation = validation_1.otpValidationSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Please review the OTP details and try again.",
                action: "validateVisitOTP:validation-error",
                data: {
                    errors: validation.error.errors,
                },
            });
            return;
        }
        const doctorUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!doctorUserId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to validate the visit.",
                action: "validateVisitOTP:not-authenticated",
            });
            return;
        }
        const { appointmentId, otp } = validation.data;
        // Find doctor
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorUserId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "validateVisitOTP:doctor-not-found",
            });
            return;
        }
        // Find doctor user detail to increment amount in the doctor user wallet
        const doctorUserDetail = yield user_model_1.default.findById(doctorUserId);
        if (!doctorUserDetail) {
            res.status(401).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "validateVisitOTP:doctor-user-not-found",
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
                action: "validateVisitOTP:no-active-subscription",
            });
            return;
        }
        const subscription = yield doctor_subscription_1.default.findById(activeSub.SubscriptionId);
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: "We couldn't find the associated subscription.",
                action: "validateVisitOTP:subscription-not-found",
            });
            return;
        }
        let platformFee = ((_b = subscription === null || subscription === void 0 ? void 0 : subscription.platformFeeClinic) === null || _b === void 0 ? void 0 : _b.figure) || 0;
        let opsExpense = ((_c = subscription === null || subscription === void 0 ? void 0 : subscription.opsExpenseClinic) === null || _c === void 0 ? void 0 : _c.figure) || 0;
        // Find appointment
        const appointment = yield clinic_appointment_model_1.default.findOne({
            _id: appointmentId,
            doctorId: doctor._id,
        });
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that appointment.",
                action: "validateVisitOTP:appointment-not-found",
            });
            return;
        }
        if (appointment.status !== "confirmed") {
            res.status(400).json({
                success: false,
                message: "Appointment is not in confirmed status.",
                action: "validateVisitOTP:invalid-status",
            });
            return;
        }
        const otpData = appointment.otp;
        // Check if OTP exists
        if (!(otpData === null || otpData === void 0 ? void 0 : otpData.code)) {
            res.status(400).json({
                success: false,
                message: "No OTP was generated for this appointment.",
                action: "validateVisitOTP:otp-missing",
            });
            return;
        }
        // Check if OTP is already used
        if (otpData === null || otpData === void 0 ? void 0 : otpData.isUsed) {
            res.status(400).json({
                success: false,
                message: "This OTP has already been used.",
                action: "validateVisitOTP:otp-used",
            });
            return;
        }
        // Check if max attempts reached
        if ((0, otp_utils_1.isMaxAttemptsReached)((otpData === null || otpData === void 0 ? void 0 : otpData.attempts) || 0, (otpData === null || otpData === void 0 ? void 0 : otpData.maxAttempts) || 3)) {
            res.status(400).json({
                success: false,
                message: "Maximum OTP verification attempts exceeded.",
                action: "validateVisitOTP:max-attempts",
            });
            return;
        }
        // Check if OTP is expired
        if ((otpData === null || otpData === void 0 ? void 0 : otpData.expiresAt) && (0, otp_utils_1.isOTPExpired)(otpData.expiresAt)) {
            res.status(400).json({
                success: false,
                message: "This OTP has expired.",
                action: "validateVisitOTP:otp-expired",
            });
            return;
        }
        // Increment attempts
        appointment.otp.attempts = ((otpData === null || otpData === void 0 ? void 0 : otpData.attempts) || 0) + 1;
        // Validate OTP
        if ((otpData === null || otpData === void 0 ? void 0 : otpData.code) !== otp.toUpperCase()) {
            yield appointment.save();
            const remainingAttempts = ((otpData === null || otpData === void 0 ? void 0 : otpData.maxAttempts) || 3) - appointment.otp.attempts;
            res.status(400).json({
                success: false,
                message: "Invalid OTP.",
                action: "validateVisitOTP:otp-mismatch",
                data: {
                    remainingAttempts,
                },
            });
            return;
        }
        // OTP is valid - complete the appointment
        appointment.status = "completed";
        appointment.otp.isUsed = true;
        //***** convert frozen amount to actual deduction *****\\
        if (((_d = appointment.paymentDetails) === null || _d === void 0 ? void 0 : _d.paymentStatus) === "pending" ||
            ((_e = appointment.paymentDetails) === null || _e === void 0 ? void 0 : _e.paymentStatus) === "frozen") {
            const patientUserDetail = yield user_model_1.default.findById(appointment.patientId);
            if (patientUserDetail) {
                const deductAmount = appointment.paymentDetails.amount;
                // Deduct from frozen amount using helper method - (deduct from user.frozenAmount + deduct from user.wallet)
                const deductSuccess = patientUserDetail.deductFrozenAmount(deductAmount);
                if (deductSuccess) {
                    yield patientUserDetail.save();
                    appointment.paymentDetails.patientWalletDeducted = deductAmount;
                    appointment.paymentDetails.patientWalletFrozen -= deductAmount;
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
                        action: "validateVisitOTP:wallet-deduction-failed",
                    });
                    return;
                }
            }
        }
        yield appointment.save();
        res.status(200).json({
            success: true,
            message: "Visit validated successfully. Appointment completed.",
            action: "validateVisitOTP:success",
            data: {
                appointment: appointment,
            },
        });
    }
    catch (error) {
        console.error("Error validating visit OTP:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't validate the clinic visit.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.validateVisitOTP = validateVisitOTP;
// Update expired clinic appointments - for cron job
const updateClinicAppointmentExpiredStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        // Find appointments that should be expired (end time has passed and status is still pending/confirmed)
        const expiredAppointments = yield clinic_appointment_model_1.default.updateMany({
            "slot.time.end": { $lt: now },
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
exports.updateClinicAppointmentExpiredStatus = updateClinicAppointmentExpiredStatus;
