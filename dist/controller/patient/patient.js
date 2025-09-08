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
exports.getHealthMetrics = exports.updateHealthMetrics = exports.getAppointmentsDoctorForPatient = exports.updatePersonalInfo = exports.updateBankDetail = exports.getPatientDashboard = exports.patientOnboard = exports.getPatientById = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const online_appointment_model_1 = __importDefault(require("../../models/appointment/online-appointment-model"));
const clinic_appointment_model_1 = __importDefault(require("../../models/appointment/clinic-appointment-model"));
const signed_url_1 = require("../../utils/signed-url");
const emergency_appointment_model_1 = __importDefault(require("../../models/appointment/emergency-appointment-model"));
const emergency_appointment_1 = require("../appointment/emergency-appointment");
const validation_1 = require("../../validation/validation");
const health_metrics_model_1 = require("../../models/health-metrics-model");
const getPatientById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Validate ID format
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid patient ID format",
            });
            return;
        }
        // Find patient by patient ID and populate user details
        const patient = yield patient_model_1.default.findById(id)
            .populate({
            path: "userId",
            select: "-password",
        })
            .select("-password");
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "Patient not found",
            });
            return;
        }
        // Generate signed URLs for the patient data
        const patientWithSignedUrls = yield (0, signed_url_1.generateSignedUrlsForUser)(patient);
        res.status(200).json({
            success: true,
            message: "Patient details fetched successfully",
            data: patientWithSignedUrls,
        });
    }
    catch (error) {
        console.error("Error fetching patient details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch patient details",
        });
    }
});
exports.getPatientById = getPatientById;
const patientOnboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { prefix, profilePic, gender, dob, address, personalIdProof, addressProof, bankDetails, mapLocation, insurance, healthMetrics, } = req.body;
        // Validate userId
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID format",
            });
            return;
        }
        // Check if user exists and has patient role
        const user = yield user_model_1.default.findOne({ _id: userId });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found or not a patient",
            });
            return;
        }
        // Validate required fields
        if (!gender || !dob || !address) {
            res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
            return;
        }
        // Prepare update data
        const updateData = {
            prefix,
            profilePic,
            gender,
            dob: new Date(dob),
            address,
            personalIdProof,
            addressProof,
            bankDetails,
            mapLocation,
            insurance,
            healthMetrics: healthMetrics,
        };
        // Update patient using discriminator model
        const updatedPatient = yield patient_model_1.default.findOneAndUpdate({ userId }, { $set: updateData }, {
            new: true,
            runValidators: true,
            select: "-password",
        });
        if (!updatedPatient) {
            res.status(500).json({
                success: false,
                message: "Failed to update patient information",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Patient onboarded successfully",
            data: updatedPatient,
        });
    }
    catch (error) {
        console.error("Error in patient onboarding:", error);
        res.status(500).json({
            success: false,
            message: "Failed to onboard patient",
            error: error.message,
        });
    }
});
exports.patientOnboard = patientOnboard;
const getPatientDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const patient = yield patient_model_1.default.findOne({ userId }).populate("userId", "firstName lastName profilePic");
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "Patient not found",
            });
            return;
        }
        // pending
        // Find all emergency appointments for this patient
        const appointments = yield emergency_appointment_model_1.default.find({
            patientId: patient._id,
            status: { $in: ["in-progress", "pending"] },
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
        const emergencyAppointmentsWithUrls = yield (0, emergency_appointment_1.convertMediaKeysToUrls)(appointments);
        const currentDate = new Date();
        // Get online appointment counts
        const [upcomingOnline, completedOnline, cancelledOnline, allOnline] = yield Promise.all([
            // Upcoming online appointments (accepted and time is in future)
            online_appointment_model_1.default.countDocuments({
                patientId: userId,
                status: "accepted",
                "slot.time.start": { $gte: currentDate },
            }),
            // Completed online appointments (accepted and time is in past)
            online_appointment_model_1.default.countDocuments({
                patientId: userId,
                status: "accepted",
                "slot.time.start": { $lt: currentDate },
            }),
            // Cancelled online appointments (rejected)
            online_appointment_model_1.default.countDocuments({
                patientId: userId,
                status: "rejected",
            }),
            // All online appointments for the patient
            online_appointment_model_1.default.countDocuments({
                patientId: userId,
            }),
        ]);
        // Get clinic appointment counts
        const [upcomingClinic, completedClinic, cancelledClinic, allClinic] = yield Promise.all([
            // Upcoming clinic appointments (confirmed and day is today or in future)
            clinic_appointment_model_1.default.countDocuments({
                patientId: userId,
                status: "confirmed",
                "slot.day": { $gte: new Date(currentDate.toDateString()) },
            }),
            // Completed clinic appointments
            clinic_appointment_model_1.default.countDocuments({
                patientId: userId,
                status: "completed",
            }),
            // Cancelled clinic appointments
            clinic_appointment_model_1.default.countDocuments({
                patientId: userId,
                status: "cancelled",
            }),
            // All clinic appointments for the patient
            clinic_appointment_model_1.default.countDocuments({
                patientId: userId,
            }),
        ]);
        // Get emergency appointment counts
        const [pendingEmergency, inProgressEmergency, completedEmergency, allEmergency,] = yield Promise.all([
            // Pending emergency appointments
            emergency_appointment_model_1.default.countDocuments({
                patientId: patient._id,
                status: "pending",
            }),
            // In-progress emergency appointments
            emergency_appointment_model_1.default.countDocuments({
                patientId: patient._id,
                status: "in-progress",
            }),
            // Completed emergency appointments
            emergency_appointment_model_1.default.countDocuments({
                patientId: patient._id,
                status: "completed",
            }),
            // All emergency appointments
            emergency_appointment_model_1.default.countDocuments({
                patientId: patient._id,
            }),
        ]);
        // Combine all appointment types counts
        const appointmentCounts = {
            upcoming: upcomingOnline + pendingEmergency + upcomingClinic, // Include confirmed clinic appointments
            completed: completedOnline + completedEmergency + completedClinic,
            cancelled: cancelledOnline + cancelledClinic, // Both online and clinic appointments can be cancelled
            all: allOnline + allEmergency + allClinic, // Total of all appointments
        };
        // Get recommended doctors based on patient's health conditions
        let recommendedDoctors = [];
        // if (patient.healthMetrics && patient.healthMetrics.length > 0) {
        //   // Get latest health metrics
        //   const latestHealthMetrics = patient.healthMetrics[patient.healthMetrics.length - 1];
        //   if (latestHealthMetrics.conditions && latestHealthMetrics.conditions.length > 0) {
        //     // Find doctors whose specialization matches patient's conditions
        //     const patientConditions = latestHealthMetrics.conditions.map(condition =>
        //       new RegExp(condition, 'i') // Case insensitive matching
        //     );
        //     recommendedDoctors = await Doctor.find({
        //       status: "approved",  // Only show approved doctors
        //       subscriptions: { $exists: true, $not: { $size: 0 } }, // Only show doctors with at least one subscription
        //       $or: [
        //         { specialization: { $in: patientConditions } },
        //         { "registration.specialization": { $in: patientConditions } }
        //       ]
        //     })
        //     .populate('userId', 'firstName lastName profilePic')
        //     .select('userId specialization experience onlineAppointment')
        //     .limit(10);
        //   }
        // }
        // If no condition-based recommendations, get general recommended doctors
        if (recommendedDoctors.length === 0) {
            const now = new Date();
            recommendedDoctors = yield doctor_model_1.default.find({
                status: "approved",
                subscriptions: {
                    $elemMatch: {
                        endDate: { $gt: now }
                    }
                }
            })
                .populate({
                path: "userId",
                select: "firstName lastName profilePic isDocumentVerified",
            })
                .select("userId specialization experience onlineAppointment homeVisit clinicVisit")
                .limit(10);
            recommendedDoctors = recommendedDoctors.filter(doctor => doctor.userId && doctor.userId.isDocumentVerified);
        }
        // Process recommended doctors to add signed URLs
        const processedDoctors = yield Promise.all(recommendedDoctors.map((doctor) => (0, signed_url_1.generateSignedUrlsForDoctor)(doctor)));
        res.status(200).json({
            success: true,
            message: "Patient dashboard data retrieved successfully",
            data: {
                appointmentCounts,
                emergencyAppointments: emergencyAppointmentsWithUrls,
                recommendedDoctors: processedDoctors,
            },
        });
    }
    catch (error) {
        console.error("Error getting patient dashboard:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get patient dashboard data",
            error: error.message,
        });
    }
});
exports.getPatientDashboard = getPatientDashboard;
const updateBankDetail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { bankDetails } = req.body;
        if (!bankDetails || Object.keys(bankDetails).length === 0) {
            res.status(400).json({
                success: false,
                message: "No bank details provided",
            });
            return;
        }
        const updatedUser = yield user_model_1.default.findByIdAndUpdate(userId, { $set: { bankDetails } }, // replace bankDetails object
        { new: true, runValidators: true, select: "-password" });
        if (!updatedUser) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Bank details updated successfully",
            data: updatedUser.bankDetails, // return just bankDetails
        });
    }
    catch (error) {
        console.error("Error updating bank details:", error);
        res.status(500).json({
            success: false,
            message: "Error updating bank details",
            error: error.message,
        });
    }
});
exports.updateBankDetail = updateBankDetail;
const updatePersonalInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { firstName, lastName, email, phone } = req.body;
        const updatedUser = yield user_model_1.default.findByIdAndUpdate(userId, {
            firstName,
            lastName,
            email,
            phone,
        }, { new: true, runValidators: true }).select("-password");
        if (!updatedUser) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        res.json({
            message: "Personal info updated successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Error updating personal info:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.updatePersonalInfo = updatePersonalInfo;
const getAppointmentsDoctorForPatient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Get online appointments
        const onlineAppointments = yield online_appointment_model_1.default.find({
            patientId: userId,
        }).populate({
            path: "doctorId",
            select: "specialization experience userId onlineAppointment",
            populate: {
                path: "userId",
                select: "firstName lastName profilePic",
            },
        });
        // Get clinic appointments
        const clinicAppointments = yield clinic_appointment_model_1.default.find({
            patientId: userId,
        }).populate({
            path: "doctorId",
            select: "specialization experience userId clinicVisit",
            populate: {
                path: "userId",
                select: "firstName lastName profilePic",
            },
        });
        // Add appointment type to differentiate between online and clinic appointments
        const onlineAppointmentsWithType = onlineAppointments.map((appointment) => (Object.assign(Object.assign({}, appointment.toObject()), { appointmentType: "online" })));
        // Add clinic details and appointment type to clinic appointments
        const clinicAppointmentsWithType = clinicAppointments.map((appointment) => {
            const appointmentObj = appointment.toObject();
            const doctor = appointmentObj.doctorId;
            const clinicVisit = doctor === null || doctor === void 0 ? void 0 : doctor.clinicVisit;
            const clinic = ((clinicVisit === null || clinicVisit === void 0 ? void 0 : clinicVisit.clinics) || []).find((c) => c._id.toString() === appointment.clinicId);
            return Object.assign(Object.assign({}, appointmentObj), { appointmentType: "clinic", clinicDetails: clinic
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
        // Combine all appointments
        const allAppointments = [
            ...onlineAppointmentsWithType,
            ...clinicAppointmentsWithType,
        ];
        // Generate signed URLs for profile pictures
        const appointmentsWithSignedUrls = yield Promise.all(allAppointments.map((appointment) => __awaiter(void 0, void 0, void 0, function* () {
            if (appointment.doctorId) {
                appointment.doctorId = yield (0, signed_url_1.generateSignedUrlsForDoctor)(appointment.doctorId);
            }
            return appointment;
        })));
        // Sort by creation date (most recent first)
        appointmentsWithSignedUrls.sort((a, b) => new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime());
        res.status(200).json({
            success: true,
            message: "Appointments for patient retrieved successfully",
            data: appointmentsWithSignedUrls,
        });
    }
    catch (error) {
        console.error("Error in getting appointments for patient:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get appointments for patient",
            error: error.message,
        });
    }
});
exports.getAppointmentsDoctorForPatient = getAppointmentsDoctorForPatient;
const updateHealthMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Validate request body
        const validationResult = validation_1.updateHealthMetricsSchema.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationResult.error.errors,
            });
            return;
        }
        // Find patient by userId
        const patient = yield patient_model_1.default.findOne({ userId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "Patient not found",
            });
            return;
        }
        const updateData = validationResult.data;
        // Try to find existing health metrics for this patient
        let healthMetrics = yield health_metrics_model_1.HealthMetrics.findOne({ patientId: patient._id });
        if (healthMetrics) {
            // Update existing health metrics document
            healthMetrics = yield health_metrics_model_1.HealthMetrics.findOneAndUpdate({ patientId: patient._id }, { $set: updateData }, { new: true, runValidators: true });
            res.status(200).json({
                success: true,
                message: "Health metrics updated successfully",
                data: healthMetrics,
            });
        }
        else {
            // Create new health metrics document if none exists
            healthMetrics = new health_metrics_model_1.HealthMetrics(Object.assign({ patientId: patient._id }, updateData));
            const savedHealthMetrics = yield healthMetrics.save();
            patient.healthMetricsId = savedHealthMetrics._id;
            yield patient.save();
            res.status(201).json({
                success: true,
                message: "Health metrics created successfully",
                data: savedHealthMetrics,
            });
        }
    }
    catch (error) {
        console.error("Error updating health metrics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update health metrics",
            error: error.message,
        });
    }
});
exports.updateHealthMetrics = updateHealthMetrics;
const getHealthMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        // Find health metrics for this patient
        const healthMetrics = yield health_metrics_model_1.HealthMetrics.findOne({
            patientId: patient._id,
        });
        if (!healthMetrics) {
            res.status(404).json({
                success: false,
                message: "Health metrics not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Health metrics retrieved successfully",
            data: healthMetrics,
        });
    }
    catch (error) {
        console.error("Error fetching health metrics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch health metrics",
            error: error.message,
        });
    }
});
exports.getHealthMetrics = getHealthMetrics;
