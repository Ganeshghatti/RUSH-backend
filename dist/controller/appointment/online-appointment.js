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
exports.updateAppointmentExpiredStatus = exports.getAllPatients = exports.getDoctorAppointmentByDate = exports.updateAppointmentStatus = exports.getPatientAppointments = exports.getDoctorAppointments = exports.bookOnlineAppointment = void 0;
const online_appointment_model_1 = __importDefault(require("../../models/appointment/online-appointment-model"));
const homevisit_appointment_model_1 = __importDefault(require("../../models/appointment/homevisit-appointment-model"));
const emergency_appointment_model_1 = __importDefault(require("../../models/appointment/emergency-appointment-model"));
const clinic_appointment_model_1 = __importDefault(require("../../models/appointment/clinic-appointment-model"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const doctor_subscription_1 = __importDefault(require("../../models/doctor-subscription"));
// Book appointment by patient
const bookOnlineAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { doctorId, slot } = req.body;
        const patientId = req.user.id;
        // Validate required fields
        if (!doctorId || !slot) {
            res.status(400).json({
                success: false,
                message: "Doctor ID and slot information are required",
            });
            return;
        }
        if (!slot.day || !slot.duration || !slot.time) {
            res.status(400).json({
                success: false,
                message: "Slot day, duration, and time are required",
            });
            return;
        }
        if (!slot.time.start || !slot.time.end) {
            res.status(400).json({
                success: false,
                message: "Slot start time and end time are required",
            });
            return;
        }
        // Check if doctor exists
        const doctor = yield doctor_model_1.default.findById(doctorId);
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found",
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
        const matchedDuration = (_a = doctor === null || doctor === void 0 ? void 0 : doctor.onlineAppointment) === null || _a === void 0 ? void 0 : _a.duration.find((item) => item.minute === slot.duration);
        if (!matchedDuration) {
            res.status(400).json({
                success: false,
                message: "Doctor does not offer this duration",
            });
            return;
        }
        const price = matchedDuration.price;
        if (patient.wallet < price) {
            res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
            });
            return;
        }
        // Check if the slot is already booked
        const existingAppointment = yield online_appointment_model_1.default.findOne({
            doctorId,
            "slot.day": new Date(slot.day),
            "slot.time.start": new Date(slot.time.start),
            "slot.time.end": new Date(slot.time.end),
            status: { $in: ["pending", "accepted"] },
        });
        if (existingAppointment) {
            res.status(400).json({
                success: false,
                message: "This slot is already booked",
            });
            return;
        }
        // Create new appointment
        const newAppointment = new online_appointment_model_1.default({
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
            history: slot.history ? { title: slot.history.title } : undefined,
            status: "pending",
        });
        yield newAppointment.save();
        // Populate the response with detailed patient and doctor information
        const populatedAppointment = yield online_appointment_model_1.default.findById(newAppointment._id)
            .populate({
            path: "patientId",
            select: "firstName lastName countryCode gender email profilePic",
        })
            .populate({
            path: "doctorId",
            select: "qualifications specialization userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        });
        res.status(201).json({
            success: true,
            data: populatedAppointment,
            message: "Appointment booked successfully",
        });
    }
    catch (error) {
        console.error("Error booking online appointment:", error);
        res.status(500).json({
            success: false,
            message: "Error booking appointment",
            error: error.message,
        });
    }
});
exports.bookOnlineAppointment = bookOnlineAppointment;
// Get all appointments for doctor
const getDoctorAppointments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doctorId = req.user.id; // Assuming the logged-in user is a doctor
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
            return;
        }
        // Find all online appointments for this doctor
        const onlineAppointments = yield online_appointment_model_1.default.find({
            doctorId: doctor._id,
        })
            .populate({
            path: "patientId",
            select: "firstName lastName countryCode gender email profilePic",
        })
            .populate({
            path: "doctorId",
            select: "qualifications specialization userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        })
            .sort({ "slot.day": 1, "slot.time.start": 1 }); // Sort by date and time
        // Find all emergency appointments for this doctor
        const emergencyAppointments = yield emergency_appointment_model_1.default.find({
            doctorId: doctor._id,
        })
            .populate({
            path: "patientId",
            select: "userId healthMetrics insurance mapLocation",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic phone dob address wallet",
            },
        })
            .populate({
            path: "doctorId",
            select: "qualifications specialization userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        })
            .sort({ createdAt: -1 }); // Sort by most recent created first
        // Find all clinic appointments for this doctor
        const clinicAppointments = yield clinic_appointment_model_1.default.find({
            doctorId: doctor._id,
        })
            .populate({
            path: "doctorId",
            select: "userId specialization clinicVisit",
            populate: {
                path: "userId",
                select: "firstName lastName profilePic",
            },
        })
            .populate({
            path: "patientId",
            select: "firstName lastName profilePic phone",
        })
            .sort({ "slot.day": -1 });
        console.log("Clinic appointments for doctor", clinicAppointments);
        // Find all home visit appointments for this doctor
        const homeVisitAppointments = yield homevisit_appointment_model_1.default.find({
            doctorId: doctor._id,
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
            .sort({ "slot.day": -1, "slot.time.start": -1 });
        res.status(200).json({
            success: true,
            onlineAppointment: onlineAppointments,
            emergencyAppointment: emergencyAppointments,
            clinicAppointment: clinicAppointments,
            homevisitAppointment: homeVisitAppointments,
            message: "Doctor appointments retrieved successfully",
        });
    }
    catch (error) {
        console.error("Error getting doctor appointments:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving appointments",
            error: error.message,
        });
    }
});
exports.getDoctorAppointments = getDoctorAppointments;
// Get all appointments for patient
const getPatientAppointments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id; // Assuming the logged-in user is a patient
        // Find the patient record
        const patient = yield patient_model_1.default.findOne({ userId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "Patient not found",
            });
            return;
        }
        // Find all online appointments for this patient (patientId references User)
        const onlineAppointments = yield online_appointment_model_1.default.find({
            patientId: userId,
        })
            .populate({
            path: "patientId",
            select: "firstName lastName countryCode gender email profilePic",
        })
            .populate({
            path: "doctorId",
            select: "qualifications specialization userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        })
            .sort({ "slot.day": 1, "slot.time.start": 1 }); // Sort by date and time
        // Find all emergency appointments for this patient (patientId references Patient)
        const emergencyAppointments = yield emergency_appointment_model_1.default.find({
            patientId: patient._id,
        })
            .populate({
            path: "patientId",
            select: "userId healthMetrics insurance mapLocation",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic phone dob address wallet",
            },
        })
            .populate({
            path: "doctorId",
            select: "qualifications specialization userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        })
            .sort({ createdAt: -1 }); // Sort by most recent created first
        // Find all clinic appointments for this patient
        const clinicAppointments = yield clinic_appointment_model_1.default.find({
            patientId: userId,
        })
            .populate("doctorId", "userId specialization clinicVisit")
            .populate({
            path: "doctorId",
            populate: {
                path: "userId",
                select: "firstName lastName profilePic",
            },
        })
            .sort({ "slot.day": -1 });
        console.log("Clinic appointments for patient", clinicAppointments);
        // Find all home visit appointments for this patient
        const homeVisitAppointments = yield homevisit_appointment_model_1.default.find({
            patientId: userId,
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
            .sort({ "slot.day": -1, "slot.time.start": -1 });
        res.status(200).json({
            success: true,
            onlineAppointment: onlineAppointments,
            emergencyAppointment: emergencyAppointments,
            clinicAppointment: clinicAppointments,
            homevisitAppointment: homeVisitAppointments,
            message: "Patient appointments retrieved successfully",
        });
    }
    catch (error) {
        console.error("Error getting patient appointments:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving appointments",
            error: error.message,
        });
    }
});
exports.getPatientAppointments = getPatientAppointments;
// Update appointment status by doctor
const updateAppointmentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { appointmentId } = req.params;
        const { status } = req.body;
        const doctorId = req.user.id; // Assuming the logged-in user is a doctor
        // Validate status
        if (!status || !["pending", "accepted", "rejected"].includes(status)) {
            res.status(400).json({
                success: false,
                message: "Valid status (pending, accepted, rejected) is required",
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
        // Find the appointment and verify it belongs to this doctor
        const appointment = yield online_appointment_model_1.default.findOne({
            _id: appointmentId,
            doctorId: doctor._id,
        });
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "Appointment not found or you don't have permission to modify it",
            });
            return;
        }
        // Only on 'accepted' status: handle wallet deduction
        if (status === "accepted") {
            const patient = yield user_model_1.default.findById(appointment.patientId);
            if (!patient) {
                res.status(404).json({
                    success: false,
                    message: "Patient not found",
                });
                return;
            }
            // Find matched price for the slot duration
            const matched = (_a = doctor === null || doctor === void 0 ? void 0 : doctor.onlineAppointment) === null || _a === void 0 ? void 0 : _a.duration.find((d) => { var _a; return d.minute === ((_a = appointment === null || appointment === void 0 ? void 0 : appointment.slot) === null || _a === void 0 ? void 0 : _a.duration); });
            if (!matched) {
                res.status(400).json({
                    success: false,
                    message: "Doctor does not support this appointment duration",
                });
                return;
            }
            const price = matched.price;
            if (patient.wallet < price) {
                res.status(400).json({
                    success: false,
                    message: "Patient has insufficient wallet balance",
                });
                return;
            }
            // Deduct amount and save patient
            patient.wallet -= price;
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
            let platformFee = subscription.platformFeeOnline || 0;
            let opsExpense = subscription.opsExpenseOnline || 0;
            let doctorEarning = price - platformFee - (price * opsExpense) / 100;
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
        // Update status
        appointment.status = status;
        yield appointment.save();
        // Populate the response with detailed patient and doctor information
        const updatedAppointment = yield online_appointment_model_1.default.findById(appointment._id)
            .populate({
            path: "patientId",
            select: "firstName lastName countryCode gender email profilePic",
        })
            .populate({
            path: "doctorId",
            select: "qualifications specialization userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        });
        res.status(200).json({
            success: true,
            data: updatedAppointment,
            message: `Appointment status updated to ${status} successfully`,
        });
    }
    catch (error) {
        console.error("Error updating appointment status:", error);
        res.status(500).json({
            success: false,
            message: "Error updating appointment status",
            error: error.message,
        });
    }
});
exports.updateAppointmentStatus = updateAppointmentStatus;
const getDoctorAppointmentByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.body; // Expected format: YYYY-MM-DD
        const doctorId = req.user.id; // Assuming the logged-in user is a doctor
        // Validate date parameter
        if (!date) {
            res.status(400).json({
                success: false,
                message: "Date is required in request body",
            });
            return;
        }
        // Find the doctor
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
            return;
        }
        // Create date range for the specified date
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1); // Next day
        // Find all appointments for this doctor on the specified date
        const appointments = yield online_appointment_model_1.default.find({
            doctorId: doctor._id,
            "slot.day": {
                $gte: startDate,
                $lt: endDate,
            },
        })
            .populate({
            path: "patientId",
            select: "firstName lastName email phone countryCode gender profilePic dob address wallet",
        })
            .populate({
            path: "doctorId",
            select: "qualifications specialization userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        })
            .sort({ "slot.time.start": 1 }); // Sort by appointment start time
        res.status(200).json({
            success: true,
            data: appointments,
            message: `Appointments for ${date} retrieved successfully`,
            count: appointments.length,
        });
    }
    catch (error) {
        console.error("Error getting doctor appointments by date:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving appointments by date",
            error: error.message,
        });
    }
});
exports.getDoctorAppointmentByDate = getDoctorAppointmentByDate;
// Get all patients with populated user details
const getAllPatients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find all patients and populate user details
        const patients = yield patient_model_1.default.find({})
            .populate({
            path: "userId",
            select: "firstName lastName email phone countryCode gender profilePic dob address wallet prefix phoneVerified personalIdProof addressProof bankDetails taxProof isDocumentVerified createdAt",
        })
            .sort({ createdAt: -1 }); // Sort by most recent created first
        res.status(200).json({
            success: true,
            data: patients,
            message: "All patients retrieved successfully",
            count: patients.length,
        });
    }
    catch (error) {
        console.error("Error getting all patients:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving patients",
            error: error.message,
        });
    }
});
exports.getAllPatients = getAllPatients;
// script for cron job
const updateAppointmentExpiredStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        // Find appointments that have passed their slot end time and are still pending or accepted
        const expiredAppointments = yield online_appointment_model_1.default.find({
            "slot.time.end": { $lt: now },
            status: { $in: ["pending", "accepted"] },
        });
        if (expiredAppointments.length > 0) {
            const updateResult = yield online_appointment_model_1.default.updateMany({
                "slot.time.end": { $lt: now },
                status: { $in: ["pending", "accepted"] },
            }, {
                $set: { status: "expired" },
            });
            console.log(`Updated ${updateResult.modifiedCount} expired appointments`);
        }
    }
    catch (error) {
        console.error("Error updating expired appointments:", error.message);
    }
});
exports.updateAppointmentExpiredStatus = updateAppointmentExpiredStatus;
