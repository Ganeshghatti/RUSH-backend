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
exports.updateClinicStatusCron = exports.validateVisitOTP = exports.getAppointmentOTP = exports.confirmClinicAppointment = exports.bookClinicAppointment = exports.getDoctorClinicAvailability = void 0;
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const clinic_appointment_model_1 = __importDefault(require("../../models/appointment/clinic-appointment-model"));
const validation_1 = require("../../validation/validation");
const mongoose_1 = __importDefault(require("mongoose"));
const otp_utils_1 = require("../../utils/otp-utils");
const doctor_subscription_1 = __importDefault(require("../../models/doctor-subscription"));
const appointment_notifications_1 = require("../../utils/mail/appointment-notifications");
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
            message: "We couldn't load the clinic availability. Please try again.",
            action: "getDoctorClinicAvailability:error",
        });
    }
});
exports.getDoctorClinicAvailability = getDoctorClinicAvailability;
// Step1 - Book clinic appointment by patient + freeze amount
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
        const doctor = yield doctor_model_1.default.findById(doctorId).populate({
            path: "userId", select: "firstName lastName email"
        });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find the selected doctor.",
                action: "bookClinicAppointment:doctor-not-found",
            });
            return;
        }
        // Validate patient
        const patient = yield patient_model_1.default.findOne({ userId: patientUserId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "bookClinicAppointment:patient-not-found",
            });
            return;
        }
        const patientId = patient._id;
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
                message: "We couldn't find your patient's User profile.",
                action: "bookClinicAppointment:patientUser-not-found",
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
            doctorId,
            patientId,
            clinicId,
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
        // Send mail notification to admin for new clinic appointment
        try { // This should be sendNewAppointmentNotification and sent to the doctor
            yield (0, appointment_notifications_1.sendNewAppointmentNotification)({
                patientName: patientUserDetail.firstName + ' ' + (patientUserDetail.lastName || ''),
                patientEmail: patientUserDetail.email,
                appointmentId: appointment._id.toString(),
                status: appointment.status,
                doctorName: doctor.userId.firstName + ' ' + (doctor.userId.lastName || ''),
                doctorEmail: doctor.userId.email,
                type: 'Clinic',
                scheduledFor: new Date(slot.time.start).toLocaleString(),
            });
            console.log("✅ Doctor clinic appointment notification sent successfully.");
        }
        catch (mailError) {
            console.error("🚨 Failed to send clinic appointment notification:", mailError);
        }
        res.status(201).json({
            success: true,
            message: "Clinic appointment booked successfully.",
            action: "bookClinicAppointment:success",
            data: {
                appointment,
                // patientAvailableBalance: (
                //   patientUserDetail as any
                // ).getAvailableBalance(),
                // note: "Amount will be deducted from the wallet once the appointment is completed.",
            },
        });
    }
    catch (error) {
        console.error("Error booking clinic appointment:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't book the clinic appointment. Please try again.",
            action: "bookClinicAppointment:error",
        });
    }
});
exports.bookClinicAppointment = bookClinicAppointment;
// Step2 - Doctor confirms (accept) or cancels (reject); patient can only cancel. Body: { status?: "accepted" | "rejected" } (default accepted).
const confirmClinicAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    try {
        const { appointmentId } = req.params;
        const status = (_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.status) !== null && _b !== void 0 ? _b : "accepted";
        const userId = (_c = req.user) === null || _c === void 0 ? void 0 : _c.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to confirm appointments.",
                action: "confirmClinicAppointment:not-authenticated",
            });
            return;
        }
        //***** Find appointment (no role filter so patient can cancel) *****\\
        const appointment = yield clinic_appointment_model_1.default.findById(appointmentId);
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that appointment.",
                action: "confirmClinicAppointment:appointment-not-found",
            });
            return;
        }
        const doctorDoc = yield doctor_model_1.default.findById(appointment.doctorId).select("userId").lean();
        const patientDoc = yield patient_model_1.default.findById(appointment.patientId).select("userId").lean();
        const doctorUserId = (_d = doctorDoc === null || doctorDoc === void 0 ? void 0 : doctorDoc.userId) === null || _d === void 0 ? void 0 : _d.toString();
        const patientUserId = (_e = patientDoc === null || patientDoc === void 0 ? void 0 : patientDoc.userId) === null || _e === void 0 ? void 0 : _e.toString();
        const isDoctor = userId === doctorUserId;
        const isPatient = userId === patientUserId;
        if (status === "rejected") {
            if (!isDoctor && !isPatient) {
                res.status(403).json({
                    success: false,
                    message: "You are not authorized to cancel this appointment.",
                    action: "confirmClinicAppointment:forbidden",
                });
                return;
            }
            if (["completed", "expired", "unattended"].includes(appointment.status)) {
                res.status(400).json({
                    success: false,
                    message: `Cannot cancel an appointment that is already ${appointment.status}.`,
                    action: "confirmClinicAppointment:invalid-status",
                });
                return;
            }
            appointment.status = "rejected";
            appointment.cancelledBy = new mongoose_1.default.Types.ObjectId(userId);
            appointment.cancelledByRole = isDoctor ? "doctor" : "patient";
            const frozen = (_g = (_f = appointment.paymentDetails) === null || _f === void 0 ? void 0 : _f.patientWalletFrozen) !== null && _g !== void 0 ? _g : 0;
            if (frozen > 0) {
                const patient = yield patient_model_1.default.findById(appointment.patientId).select("userId").lean();
                const patientUserId = (_h = patient === null || patient === void 0 ? void 0 : patient.userId) === null || _h === void 0 ? void 0 : _h.toString();
                if (patientUserId) {
                    const patientUser = yield user_model_1.default.findById(patientUserId);
                    if (patientUser) {
                        patientUser.unfreezeAmount(frozen);
                        yield patientUser.save();
                    }
                }
                if (appointment.paymentDetails) {
                    appointment.paymentDetails.patientWalletFrozen = 0;
                }
            }
            yield appointment.save();
            res.status(200).json({
                success: true,
                message: "Appointment cancelled successfully.",
                action: "confirmClinicAppointment:cancelled",
                data: appointment,
            });
            return;
        }
        if (status !== "accepted") {
            res.status(400).json({
                success: false,
                message: "Status must be accepted or rejected.",
                action: "confirmClinicAppointment:invalid-status",
            });
            return;
        }
        if (!isDoctor) {
            res.status(403).json({
                success: false,
                message: "Only the doctor can accept this appointment.",
                action: "confirmClinicAppointment:forbidden",
            });
            return;
        }
        if (appointment.status !== "pending") {
            res.status(400).json({
                success: false,
                message: "Only pending appointments can be accepted.",
                action: "confirmClinicAppointment:invalid-status",
            });
            return;
        }
        // Update appointment status to accepted and generate OTP
        appointment.status = "accepted";
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
            message: "Appointment accepted successfully.",
            action: "confirmClinicAppointment:success",
            data: {
                appointmentId: appointment._id,
                status: appointment.status,
                otpGenerated: true,
                paymentStatus: (_j = appointment.paymentDetails) === null || _j === void 0 ? void 0 : _j.paymentStatus,
                patientWalletDeducted: (_k = appointment.paymentDetails) === null || _k === void 0 ? void 0 : _k.patientWalletDeducted,
                patientAmountFrozen: (_l = appointment.paymentDetails) === null || _l === void 0 ? void 0 : _l.patientWalletFrozen,
            },
        });
    }
    catch (error) {
        console.error("Error confirming clinic appointment:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't confirm the clinic appointment. Please try again.",
            action: "confirmClinicAppointment:error",
        });
    }
});
exports.confirmClinicAppointment = confirmClinicAppointment;
// Cancel/Reject clinic appointment (Doctor only)
// export const cancelClinicAppointment = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { appointmentId } = req.params;
//     const doctorUserId = req.user?.id;
//     if (!doctorUserId) {
//       res.status(401).json({
//         success: false,
//         message: "You must be signed in to cancel appointments.",
//         action: "cancelClinicAppointment:not-authenticated",
//       });
//       return;
//     }
//     // Find doctor by userId
//     const doctor = await Doctor.findOne({ userId: doctorUserId });
//     if (!doctor) {
//       res.status(404).json({
//         success: false,
//         message: "We couldn't find your doctor profile.",
//         action: "cancelClinicAppointment:doctor-not-found",
//       });
//       return;
//     }
//     // Find appointment
//     const appointment = await ClinicAppointment.findOne({
//       _id: appointmentId,
//       doctorId: doctor._id,
//     });
//     if (!appointment) {
//       res.status(404).json({
//         success: false,
//         message: "We couldn't find that appointment.",
//         action: "cancelClinicAppointment:appointment-not-found",
//       });
//       return;
//     }
//     if (
//       appointment.status === "completed" ||
//       appointment.status === "cancelled"
//     ) {
//       res.status(400).json({
//         success: false,
//         message: "This appointment is already completed or cancelled.",
//         action: "cancelClinicAppointment:invalid-status",
//       });
//       return;
//     }
//     // Handle refunds based on payment status
//     let refundAmount = 0;
//     if (
//       appointment.paymentDetails?.patientWalletDeducted &&
//       appointment.paymentDetails.patientWalletDeducted > 0
//     ) {
//       const patient = await User.findById(appointment.patientId);
//       if (patient) {
//         refundAmount = appointment.paymentDetails.patientWalletDeducted;
//         if (appointment.paymentDetails.paymentStatus === "pending") {
//           // If amount was frozen, unfreeze it using helper method
//           (patient as any).unfreezeAmount(refundAmount);
//         } else if (appointment.paymentDetails.paymentStatus === "completed") {
//           // If amount was already deducted, refund to wallet
//           patient.wallet += refundAmount;
//         }
//         await patient.save();
//       }
//     }
//     // Update appointment status to cancelled
//     appointment.status = "cancelled";
//     // Note: Cancellation reason removed since history field is removed
//     await appointment.save();
//     res.status(200).json({
//       success: true,
//       message: "Appointment cancelled successfully.",
//       action: "cancelClinicAppointment:success",
//       data: {
//         appointmentId: appointment._id,
//         status: appointment.status,
//         refunded: refundAmount,
//         refundType:
//           appointment.paymentDetails?.paymentStatus === "frozen"
//             ? "unfrozen"
//             : "refunded",
//       },
//     });
//   } catch (error) {
//     console.error("Error cancelling clinic appointment:", error);
//     res.status(500).json({
//       success: false,
//       message: "We couldn't cancel the clinic appointment.",
//       action: error instanceof Error ? error.message : String(error),
//     });
//   }
// };
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
        if (appointment.status !== "accepted") {
            res.status(400).json({
                success: false,
                message: "OTP is only available for accpeted appointments.",
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
            message: "We couldn't retrieve the appointment OTP. Please try again.",
            action: "getAppointmentOTP:error",
        });
    }
});
exports.getAppointmentOTP = getAppointmentOTP;
// Step3 - Validate OTP and complete appointment
const validateVisitOTP = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
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
        const { appointmentId, otp } = validation.data;
        const doctorUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!doctorUserId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to validate the visit.",
                action: "validateVisitOTP:not-authenticated",
            });
            return;
        }
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
        }).populate({
            path: "patientId",
            select: "firstName lastName email",
        });
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that appointment.",
                action: "validateVisitOTP:appointment-not-found",
            });
            return;
        }
        if (appointment.status !== "accepted") {
            res.status(400).json({
                success: false,
                message: "Appointment is not in accepted status.",
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
        if (((_d = appointment.paymentDetails) === null || _d === void 0 ? void 0 : _d.paymentStatus) === "pending") {
            const patientUserDetail = yield user_model_1.default.findOne({
                "roleRefs.patient": appointment.patientId,
            });
            if (patientUserDetail) {
                const deductAmount = appointment.paymentDetails.amount;
                // Deduct from frozen amount using helper method - (deduct from user.frozenAmount + deduct from user.wallet)
                const deductSuccess = patientUserDetail.deductFrozenAmount(deductAmount);
                if (deductSuccess) {
                    yield patientUserDetail.save();
                    // increment in doctor user
                    let incrementAmount = deductAmount - platformFee - (deductAmount * opsExpense) / 100;
                    if (incrementAmount < 0)
                        incrementAmount = 0;
                    doctorUserDetail.wallet += incrementAmount;
                    yield doctorUserDetail.save();
                    appointment.paymentDetails.patientWalletDeducted = deductAmount;
                    appointment.paymentDetails.patientWalletFrozen -= deductAmount;
                    appointment.paymentDetails.paymentStatus = "completed";
                    appointment.paymentDetails.doctorPlatformFee = platformFee;
                    appointment.paymentDetails.doctorOpsExpense = opsExpense;
                    appointment.paymentDetails.doctorEarning = incrementAmount;
                    yield appointment.save();
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
            else {
                res.status(401).json({
                    success: false,
                    message: "We couldn't find patient's user profile.",
                    action: "finalizePayment:patientUser-not-found",
                });
                return;
            }
        }
        yield appointment.save();
        // Send completion notification to patient
        try {
            const patientInfo = appointment.patientId;
            const doctorInfo = doctor.userId;
            yield (0, appointment_notifications_1.sendAppointmentStatusNotification)({
                appointmentId: appointment._id.toString(),
                status: 'completed',
                patientName: `${patientInfo.firstName} ${patientInfo.lastName}`,
                patientEmail: patientInfo.email,
                doctorName: `${doctorInfo.firstName} ${doctorInfo.lastName}`,
                doctorEmail: doctorInfo.email,
                type: 'Clinic',
            });
        }
        catch (mailError) {
            console.error("🚨 Failed to send clinic completion notification:", mailError);
        }
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
            message: "We couldn't validate the clinic visit. Please try again.",
            action: "validateVisitOTP:error",
        });
    }
});
exports.validateVisitOTP = validateVisitOTP;
//***** script for cron job
const updateClinicStatusCron = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const appointments = yield clinic_appointment_model_1.default.find({
            "slot.time.end": { $lt: now },
            status: { $in: ["pending", "accepted"] },
        });
        if (appointments.length === 0) {
            return {
                success: true,
                message: "No clinic appointments to update.",
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
            // pending -> expired
            if (status === "pending") {
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
            // accepted → completed or unattended
            else if (status === "accepted") {
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
            message: "Clinic Statuses updated.",
            summary: { expired, completed, unattended },
        };
    }
    catch (error) {
        console.error("Cron job error in updateClinicStatusCron:", error);
        return {
            success: false,
            message: "Cron job failed to update clinic appointments.",
        };
    }
});
exports.updateClinicStatusCron = updateClinicStatusCron;
