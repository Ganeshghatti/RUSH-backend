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
exports.getDoctorAppointmentByDate = exports.getPatientAppointments = exports.getDoctorAppointments = void 0;
const online_appointment_model_1 = __importDefault(require("../../models/appointment/online-appointment-model"));
const emergency_appointment_model_1 = __importDefault(require("../../models/appointment/emergency-appointment-model"));
const clinic_appointment_model_1 = __importDefault(require("../../models/appointment/clinic-appointment-model"));
const homevisit_appointment_model_1 = __importDefault(require("../../models/appointment/homevisit-appointment-model"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
/**
 * Shared appointment controller for routes that aggregate all 4 appointment types
 * (online, emergency, clinic, home visit). Used by GET /appointment/doctor,
 * GET /appointment/patient, POST /appointment/doctor/by-date.
 */
/** GET all appointments for the logged-in doctor (all 4 types) */
const getDoctorAppointments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doctorUserId = req.user.id;
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorUserId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "getDoctorAppointments:doctor-not-found",
            });
            return;
        }
        const doctorId = doctor._id;
        const onlineAppointments = yield online_appointment_model_1.default.find({ doctorId })
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
            select: "qualifications specialization userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        })
            .sort({ "slot.day": 1, "slot.time.start": 1 });
        const emergencyAppointments = yield emergency_appointment_model_1.default.find({ doctorId })
            .populate({
            path: "patientId",
            select: "userId healthMetrics insurance mapLocation",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
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
            .sort({ createdAt: -1 });
        const clinicAppointments = yield clinic_appointment_model_1.default.find({ doctorId })
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
            select: "userId specialization clinicVisit",
            populate: {
                path: "userId",
                select: "firstName lastName profilePic",
            },
        })
            .sort({ "slot.day": -1, "slot.time.start": -1 });
        const homeVisitAppointments = yield homevisit_appointment_model_1.default.find({ doctorId })
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
        })
            .sort({ "slot.day": -1, "slot.time.start": -1 });
        res.status(200).json({
            success: true,
            message: "Doctor appointments retrieved successfully.",
            action: "getDoctorAppointments:success",
            data: {
                onlineAppointments,
                emergencyAppointments,
                clinicAppointments,
                homeVisitAppointments,
            },
        });
    }
    catch (error) {
        console.error("Error getting doctor appointments:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load the doctor appointments. Please try again.",
            action: "getDoctorAppointments:error",
        });
    }
});
exports.getDoctorAppointments = getDoctorAppointments;
/** GET all appointments for the logged-in patient (all 4 types) */
const getPatientAppointments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const patient = yield patient_model_1.default.findOne({ userId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "getPatientAppointments:patient-not-found",
            });
            return;
        }
        const patientId = patient._id;
        const onlineAppointments = yield online_appointment_model_1.default.find({ patientId })
            .select("-paymentDetails.doctorPlatformFee -paymentDetails.doctorOpsExpense -paymentDetails.doctorEarning")
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
            select: "qualifications specialization userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        })
            .populate({ path: "ratingId", select: "rating review updatedAt" })
            .sort({ "slot.day": 1, "slot.time.start": 1 });
        const emergencyAppointments = yield emergency_appointment_model_1.default.find({ patientId })
            .select("-paymentDetails.doctorPlatformFee -paymentDetails.doctorOpsExpense -paymentDetails.doctorEarning")
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
            select: "qualifications specialization userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        })
            .populate({ path: "ratingId", select: "rating review updatedAt" })
            .sort({ createdAt: -1 });
        const clinicAppointments = yield clinic_appointment_model_1.default.find({ patientId })
            .select("-paymentDetails.doctorPlatformFee -paymentDetails.doctorOpsExpense -paymentDetails.doctorEarning")
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
            select: "qualifications specialization userId clinicVisit",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        })
            .populate({ path: "ratingId", select: "rating review updatedAt" })
            .sort({ "slot.day": 1, "slot.time.start": 1 });
        const homeVisitAppointments = yield homevisit_appointment_model_1.default.find({ patientId })
            .select("-paymentDetails.doctorPlatformFee -paymentDetails.doctorOpsExpense -paymentDetails.doctorEarning")
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
        })
            .populate({ path: "ratingId", select: "rating review updatedAt" })
            .sort({ "slot.day": -1, "slot.time.start": -1 });
        res.status(200).json({
            success: true,
            message: "Patient appointments retrieved successfully.",
            action: "getPatientAppointments:success",
            data: {
                onlineAppointments,
                emergencyAppointments,
                clinicAppointments,
                homeVisitAppointments,
            },
        });
    }
    catch (error) {
        console.error("Error getting patient appointments:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load the patient appointments. Please try again.",
            action: "getPatientAppointments:error",
        });
    }
});
exports.getPatientAppointments = getPatientAppointments;
/** POST get doctor's appointments for a given date (body: { date: "YYYY-MM-DD" }). Currently returns online appointments only. */
const getDoctorAppointmentByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.body;
        if (!date) {
            res.status(400).json({
                success: false,
                message: "Date is required in request body.",
                action: "getDoctorAppointmentByDate:missing-date",
            });
            return;
        }
        const doctorUserId = req.user.id;
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorUserId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "getDoctorAppointmentByDate:doctor-not-found",
            });
            return;
        }
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        const appointments = yield online_appointment_model_1.default.find({
            doctorId: doctor._id,
            "slot.day": {
                $gte: startDate,
                $lt: endDate,
            },
        })
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
            select: "qualifications specialization userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode gender email profilePic",
            },
        })
            .sort({ "slot.time.start": 1 });
        res.status(200).json({
            success: true,
            message: `Appointments for ${date} retrieved successfully.`,
            action: "getDoctorAppointmentByDate:success",
            data: {
                appointments,
                count: appointments.length,
            },
        });
    }
    catch (error) {
        console.error("Error getting doctor appointments by date:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't retrieve appointments for that date. Please try again.",
            action: "getDoctorAppointmentByDate:error",
        });
    }
});
exports.getDoctorAppointmentByDate = getDoctorAppointmentByDate;
