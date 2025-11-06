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
exports.updateEmergencyAppointmentExpiredStatus = exports.finalPayment = exports.createEmergencyRoomAccessToken = exports.acceptEmergencyAppointment = exports.getPatientEmergencyAppointments = exports.getAllEmergencyAppointments = exports.createEmergencyAppointment = exports.convertMediaKeysToUrls = void 0;
const emergency_appointment_model_1 = __importDefault(require("../../models/appointment/emergency-appointment-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const validation_1 = require("../../validation/validation");
const twilio_1 = __importDefault(require("twilio"));
const twilio_2 = require("twilio");
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
/* create emergency appointment when patient requests + freeze 2500*/
const createEmergencyAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validate request body
        const validationResult = validation_1.createEmergencyAppointmentSchema.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: "Please review the emergency request details and try again.",
                action: "createEmergencyAppointment:validation-error",
                data: {
                    errors: validationResult.error.errors,
                },
            });
            return;
        }
        const { title, description, media, location, contactNumber, name } = validationResult.data;
        const patientUserId = req.user.id;
        // Find patient by userId
        const patient = yield patient_model_1.default.findOne({ userId: patientUserId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "createEmergencyAppointment:patient-not-found",
            });
            return;
        }
        // Check user's wallet balance
        const patientUserDetail = yield user_model_1.default.findById(patientUserId);
        if (!patientUserDetail) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your account details.",
                action: "createEmergencyAppointment:patient-user-not-found",
            });
            return;
        }
        // Check if user has sufficient balance (2500)
        const patientAvailableBalance = patientUserDetail.getAvailableBalance();
        if (patientAvailableBalance < 2500) {
            res.status(400).json({
                success: false,
                message: "Insufficient wallet balance. Add funds to reserve this emergency appointment (₹2500 required).",
                action: "createEmergencyAppointment:insufficient-balance",
                data: {
                    totalBalance: patientUserDetail.wallet,
                    availableBalance: patientAvailableBalance,
                    frozenAmount: patientUserDetail.frozenAmount,
                    requiredBalance: 2500,
                },
            });
            return;
        }
        // freeze rs2500 from patient user wallet
        const freezeSuccess = patientUserDetail.freezeAmount(2500);
        if (!freezeSuccess) {
            res.status(400).json({
                success: false,
                message: "We couldn't reserve the emergency booking amount.",
                action: "createEmergencyAppointment:freeze-failed",
            });
            return;
        }
        yield patientUserDetail.save();
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
            paymentDetails: {
                amount: 2500,
                patientWalletDeducted: 0,
                patientWalletFrozen: 2500,
                paymentStatus: "pending",
            },
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
        const appointmentsWithUrls = yield (0, exports.convertMediaKeysToUrls)([
            populatedAppointment,
        ]);
        res.status(201).json({
            success: true,
            message: "Emergency appointment created successfully.",
            action: "createEmergencyAppointment:success",
            data: appointmentsWithUrls[0],
        });
    }
    catch (error) {
        console.error("Error creating emergency appointment:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't create the emergency appointment.",
            action: error.message,
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
            message: "Emergency appointments retrieved successfully.",
            action: "getAllEmergencyAppointments:success",
            data: {
                appointments: appointmentsWithUrls,
                count: appointmentsWithUrls.length,
            },
        });
    }
    catch (error) {
        console.error("Error getting emergency appointments:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load emergency appointments right now.",
            action: error.message,
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
                message: "We couldn't find your patient profile.",
                action: "getPatientEmergencyAppointments:patient-not-found",
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
            message: "Patient emergency appointments retrieved successfully.",
            action: "getPatientEmergencyAppointments:success",
            data: {
                appointments: appointmentsWithUrls,
                count: appointmentsWithUrls.length,
            },
        });
    }
    catch (error) {
        console.error("Error getting patient emergency appointments:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load the patient's emergency appointments.",
            action: error.message,
        });
    }
});
exports.getPatientEmergencyAppointments = getPatientEmergencyAppointments;
/* doctor accepts emergency appointment + emergency online room is created */
const acceptEmergencyAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const doctorUserId = req.user.id;
        // Find doctor by userId
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorUserId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "acceptEmergencyAppointment:doctor-not-found",
            });
            return;
        }
        // Find the emergency appointment by ID
        const emergencyAppointment = yield emergency_appointment_model_1.default.findById(id);
        if (!emergencyAppointment) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that emergency appointment.",
                action: "acceptEmergencyAppointment:appointment-not-found",
            });
            return;
        }
        // Check if appointment is already accepted
        if (emergencyAppointment.status !== "pending") {
            res.status(400).json({
                success: false,
                message: "This emergency appointment is already accepted or completed.",
                action: "acceptEmergencyAppointment:invalid-status",
            });
            return;
        }
        // Find patient
        const patient = yield patient_model_1.default.findById(emergencyAppointment.patientId);
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find the patient profile.",
                action: "acceptEmergencyAppointment:patient-not-found",
            });
            return;
        }
        // Create Twilio room for emergency consultation
        const roomName = `emergency_${id}`;
        const room = yield client.video.v1.rooms.create({
            uniqueName: roomName,
            type: "group",
            maxParticipants: 2,
        });
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
            message: "Emergency appointment accepted successfully.",
            action: "acceptEmergencyAppointment:success",
            data: {
                appointment: updatedAppointment,
                roomName: room.uniqueName,
            },
        });
    }
    catch (error) {
        console.error("Error accepting emergency appointment:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't accept the emergency appointment.",
            action: error.message,
        });
    }
});
exports.acceptEmergencyAppointment = acceptEmergencyAppointment;
/* create room access token */
const AccessToken = twilio_2.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const createEmergencyRoomAccessToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomName } = req.body;
        if (!roomName) {
            res
                .status(400)
                .json({
                success: false,
                message: "Room name is required.",
                action: "createEmergencyRoomAccessToken:missing-room-name",
            });
            return;
        }
        const identity = req.user.id; //user id of user who joined
        // finding appointment using roomName
        const appointment = yield emergency_appointment_model_1.default.findOne({ roomName });
        if (!appointment || appointment.status !== "in-progress") {
            res.status(404).json({
                success: false,
                message: "We couldn't find an active emergency appointment for this room.",
                action: "createEmergencyRoomAccessToken:appointment-not-found",
            });
            return;
        }
        const doctorId = appointment === null || appointment === void 0 ? void 0 : appointment.doctorId;
        const patientId = appointment === null || appointment === void 0 ? void 0 : appointment.patientId;
        // doctor's user id
        const doctor = yield doctor_model_1.default.findById(doctorId);
        if (!doctor) {
            res.status(400).json({
                success: false,
                message: "We couldn't find the doctor profile.",
                action: "createEmergencyRoomAccessToken:doctor-not-found",
            });
            return;
        }
        const doctorUserId = doctor === null || doctor === void 0 ? void 0 : doctor.userId;
        // patient's user id
        const patient = yield patient_model_1.default.findById(patientId);
        if (!patient) {
            res.status(400).json({
                success: false,
                message: "We couldn't find the patient profile.",
                action: "createEmergencyRoomAccessToken:patient-not-found",
            });
            return;
        }
        const patientUserId = patient === null || patient === void 0 ? void 0 : patient.userId;
        let whoJoined = "";
        if (identity == doctorUserId)
            whoJoined = "doctor";
        else if (identity == patientUserId)
            whoJoined = "patient";
        if (!whoJoined) {
            res.status(403).json({
                success: false,
                message: "You are not authorized to join this room.",
                action: "createEmergencyRoomAccessToken:unauthorised",
            });
            return;
        }
        console.log("The user who joined is ", whoJoined);
        // creating token for this identity.
        const token = new AccessToken(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET, { identity: `${whoJoined}_${identity}` });
        const videoGrant = new VideoGrant({ room: roomName });
        token.addGrant(videoGrant);
        const jwtToken = token.toJwt();
        res.status(200).json({
            success: true,
            message: "Access token generated successfully.",
            action: "createEmergencyRoomAccessToken:success",
            data: {
                token: jwtToken,
                role: whoJoined,
                identity: `${whoJoined}_${identity}`,
                roomName,
                appointmentType: "emergency",
            },
        });
    }
    catch (err) {
        console.error("Failed to generate  twilio access token:", err);
        res
            .status(500)
            .json({
            success: false,
            message: "We couldn't generate the room access token.",
            action: err instanceof Error ? err.message : String(err),
        });
    }
});
exports.createEmergencyRoomAccessToken = createEmergencyRoomAccessToken;
/* doctor joins video call -> reduce unfrozeAmount + wallet from patient, increase wallet of doctor, change paymentStatus of appointment */
const finalPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        // room name coming from frontend
        const { roomName } = req.body;
        if (!roomName) {
            res.status(400).json({
                success: false,
                message: "Room name is required.",
                action: "emergencyFinalPayment:missing-room-name",
            });
            return;
        }
        // find the appointment with this room name
        const appointment = yield emergency_appointment_model_1.default.findOne({ roomName });
        if (!appointment) {
            res.status(400).json({
                success: false,
                message: "We couldn't find an appointment for this room.",
                action: "emergencyFinalPayment:appointment-not-found",
            });
            return;
        }
        // check payment status of this appointment
        const paymentStatus = (_a = appointment.paymentDetails) === null || _a === void 0 ? void 0 : _a.paymentStatus;
        if (paymentStatus === "pending") {
            const patient = yield patient_model_1.default.findById(appointment.patientId);
            const patientUserDetail = yield user_model_1.default.findOne({
                "roleRefs.patient": appointment.patientId,
            });
            if (!patientUserDetail || !patient) {
                res.status(400).json({
                    sucess: false,
                    message: "We couldn't find the patient profile.",
                    action: "emergencyFinalPayment:patient-not-found",
                });
                return;
            }
            const doctor = yield doctor_model_1.default.findById(appointment.doctorId);
            const doctorUserDetail = yield user_model_1.default.findOne({
                "roleRefs.doctor": appointment.doctorId,
            });
            if (!doctorUserDetail || !doctor) {
                res.status(400).json({
                    sucess: false,
                    message: "We couldn't find the doctor profile.",
                    action: "emergencyFinalPayment:doctor-not-found",
                });
                return;
            }
            //***** Find doctor subscription to get info of the fee deduction *****\\
            const now = new Date();
            const activeSub = doctor.subscriptions.find((sub) => !sub.endDate || sub.endDate > now);
            if (!activeSub) {
                res.status(400).json({
                    success: false,
                    message: "The doctor does not have an active subscription.",
                    action: "emergencyFinalPayment:no-active-subscription",
                });
                return;
            }
            const subscription = yield doctor_subscription_1.default.findById(activeSub.SubscriptionId);
            if (!subscription) {
                res.status(404).json({
                    success: false,
                    message: "We couldn't find the associated subscription.",
                    action: "emergencyFinalPayment:subscription-not-found",
                });
                return;
            }
            // Emergency appointments use normal platformFee and opsExpense fields
            let platformFee = ((_b = subscription.platformFeeEmergency) === null || _b === void 0 ? void 0 : _b.figure) || 0;
            let opsExpense = ((_c = subscription.opsExpenseEmergency) === null || _c === void 0 ? void 0 : _c.figure) || 0;
            // these two are added becasue if doctor subscription does not have platformFeeOnline and expense key(old data) these two will be undefined.
            if (!platformFee)
                platformFee = 0;
            if (!opsExpense)
                opsExpense = 0;
            if (appointment.paymentDetails) {
                const deductAmount = appointment.paymentDetails.patientWalletFrozen;
                // deduct forzenAmount as well as wallet from patient user
                const deductSuccess = patientUserDetail.deductFrozenAmount(deductAmount);
                if (deductSuccess) {
                    yield patientUserDetail.save();
                    // appointment?.paymentDetails?.paymentStatus = "completed"; we are not marking the appointment complete here because this api is called as soon as doctor joins the online video.
                    // increment in doctor user
                    let incrementAmount = deductAmount - platformFee - (deductAmount * opsExpense) / 100;
                    if (incrementAmount < 0)
                        incrementAmount = 0;
                    doctorUserDetail.wallet += incrementAmount;
                    yield doctorUserDetail.save();
                    appointment.paymentDetails.paymentStatus = "completed";
                    appointment.paymentDetails.patientWalletDeducted = deductAmount;
                    appointment.paymentDetails.patientWalletFrozen -= deductAmount;
                    yield appointment.save();
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: "We couldn't process the final payment.",
                        action: "emergencyFinalPayment:wallet-deduction-failed",
                    });
                    return;
                }
            }
            res.status(200).json({
                success: true,
                message: "Final payment completed.",
                action: "emergencyFinalPayment:success",
            });
            return;
        }
        else if (paymentStatus === "completed") {
            res.status(200).json({
                sucess: true,
                message: "Final payment is already processed.",
                action: "emergencyFinalPayment:already-processed",
            });
            return;
        }
    }
    catch (err) {
        console.error("Error processing final payment: ", err);
        res.status(500).json({
            success: false,
            message: "We couldn't process the final payment.",
            action: err.message,
        });
    }
});
exports.finalPayment = finalPayment;
// Update expired clinic appointments - for cron job
const updateEmergencyAppointmentExpiredStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        // Find appointments that should be expired (end time has passed and status is still pending/confirmed)
        const expiredAppointments = yield emergency_appointment_model_1.default.updateMany({
            createdAt: { $lt: now },
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
