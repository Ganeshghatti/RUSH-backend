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
exports.updateOnlineStatusCron = exports.getAllPatients = exports.finalPayment = exports.createRoomAccessToken = exports.confirmOnlineAppointment = exports.bookOnlineAppointment = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const twilio_1 = __importDefault(require("twilio"));
const twilio_2 = require("twilio");
const online_appointment_model_1 = __importDefault(require("../../models/appointment/online-appointment-model"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const doctor_subscription_1 = __importDefault(require("../../models/doctor-subscription"));
const appointment_notifications_1 = require("../../utils/mail/appointment-notifications");
const validation_1 = require("../../validation/validation");
/* step 1 - Book appointment by patient + Amount freeze*/
const bookOnlineAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const validationResult = validation_1.onlineAppointmentBookSchema.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: "Please review the booking details and try again.",
                action: "bookOnlineAppointment:validation-error",
                data: { errors: validationResult.error.errors },
            });
            return;
        }
        const { doctorId, slot } = validationResult.data;
        const patientUserId = req.user.id;
        // Check if doctor exists
        const doctor = yield doctor_model_1.default.findById(doctorId).populate({
            path: "userId",
            select: "firstName lastName email",
        });
        const patientUserDetail = yield user_model_1.default.findById(patientUserId);
        if (!patientUserDetail) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient's user profile.",
                action: "bookOnlineAppointment:patientUser-not-found",
            });
            return;
        }
        // check if patient exists
        const patient = yield patient_model_1.default.findOne({ userId: patientUserId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "bookOnlineAppointment:patient-not-found",
            });
            return;
        }
        const patientId = patient._id;
        const matchedDuration = (_a = doctor === null || doctor === void 0 ? void 0 : doctor.onlineAppointment) === null || _a === void 0 ? void 0 : _a.duration.find((item) => item.minute === slot.duration);
        if (!matchedDuration) {
            res.status(400).json({
                success: false,
                message: "The doctor does not offer this appointment duration.",
                action: "bookOnlineAppointment:unsupported-duration",
            });
            return;
        }
        const price = matchedDuration.price;
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
                message: "This slot is already booked.",
                action: "bookOnlineAppointment:slot-unavailable",
            });
            return;
        }
        // check available balance = (wallet - frozenAmount)
        const patientAvailableBalance = patientUserDetail.getAvailableBalance();
        if (patientAvailableBalance < price) {
            res.status(400).json({
                success: false,
                message: "Your wallet balance is too low for this booking.",
                action: "bookOnlineAppointment:insufficient-balance",
            });
            return;
        }
        // freezing the price of appointment
        const freezeSuccess = patientUserDetail.freezeAmount(price);
        if (!freezeSuccess) {
            res.status(400).json({
                success: false,
                message: "We couldn't reserve the appointment amount.",
                action: "bookOnlineAppointment:freeze-failed",
                data: {
                    required: price,
                    available: patientUserDetail.wallet - patientUserDetail.frozenAmount,
                    totalWallet: patientUserDetail.wallet,
                },
            });
            return;
        }
        yield patientUserDetail.save();
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
            paymentDetails: {
                amount: price,
                patientWalletDeducted: 0,
                patientWalletFrozen: price,
                paymentStatus: "pending",
            },
        });
        yield newAppointment.save();
        try {
            yield (0, appointment_notifications_1.sendNewAppointmentNotification)({
                patientName: patientUserDetail.firstName + ' ' + (patientUserDetail.lastName || ''),
                patientEmail: patientUserDetail.email,
                appointmentId: newAppointment._id.toString(), // Changed from appointment._id to newAppointment._id
                status: newAppointment.status,
                doctorName: (doctor === null || doctor === void 0 ? void 0 : doctor.userId).firstName + ' ' + ((doctor === null || doctor === void 0 ? void 0 : doctor.userId).lastName || ''),
                doctorEmail: (doctor === null || doctor === void 0 ? void 0 : doctor.userId).email,
                type: 'Online',
                scheduledFor: new Date(slot.time.start).toLocaleString(),
            });
            console.log("✅ Doctor online appointment notification sent successfully.");
        }
        catch (mailError) {
            console.error("🚨 Failed to send online appointment notification:", mailError);
        }
        // Populate the response with detailed patient and doctor information
        const populatedAppointment = yield online_appointment_model_1.default.findById(newAppointment._id)
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
        });
        res.status(201).json({
            success: true,
            message: "Appointment booked successfully.",
            action: "bookOnlineAppointment:success",
            data: populatedAppointment,
        });
    }
    catch (error) {
        console.error("Error booking online appointment:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't book the appointment right now. Please try again.",
            action: "bookOnlineAppointment:error",
        });
    }
});
exports.bookOnlineAppointment = bookOnlineAppointment;
/* step 2 - Confirm online appointment: doctor can accept/reject, patient can reject (cancel). On reject: unfreeze amount, set cancelledBy. */
const confirmOnlineAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { appointmentId } = req.params;
        const { status } = req.body;
        const userId = req.user.id;
        if (!status || !["pending", "accepted", "rejected"].includes(status)) {
            res.status(400).json({
                success: false,
                message: "Status must be one of pending, accepted, or rejected.",
                action: "confirmOnlineAppointment:invalid-status",
            });
            return;
        }
        const appointment = yield online_appointment_model_1.default.findById(appointmentId);
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "Appointment not found.",
                action: "confirmOnlineAppointment:appointment-not-found",
            });
            return;
        }
        const doctor = yield doctor_model_1.default.findById(appointment.doctorId).select("userId").lean();
        const patient = yield patient_model_1.default.findById(appointment.patientId).select("userId").lean();
        const doctorUserId = (_a = doctor === null || doctor === void 0 ? void 0 : doctor.userId) === null || _a === void 0 ? void 0 : _a.toString();
        const patientUserId = (_b = patient === null || patient === void 0 ? void 0 : patient.userId) === null || _b === void 0 ? void 0 : _b.toString();
        const isDoctor = userId === doctorUserId;
        const isPatient = userId === patientUserId;
        if (status === "accepted") {
            if (!isDoctor) {
                res.status(403).json({
                    success: false,
                    message: "Only the doctor can accept this appointment.",
                    action: "confirmOnlineAppointment:forbidden",
                });
                return;
            }
        }
        else if (status === "rejected") {
            if (!isDoctor && !isPatient) {
                res.status(403).json({
                    success: false,
                    message: "You are not authorized to update this appointment.",
                    action: "confirmOnlineAppointment:forbidden",
                });
                return;
            }
            if (["completed", "expired", "unattended"].includes(appointment.status)) {
                res.status(400).json({
                    success: false,
                    message: `Cannot cancel an appointment that is already ${appointment.status}.`,
                    action: "confirmOnlineAppointment:invalid-status",
                });
                return;
            }
            appointment.cancelledBy = new mongoose_1.default.Types.ObjectId(userId);
            appointment.cancelledByRole = isDoctor ? "doctor" : "patient";
            const frozen = (_d = (_c = appointment.paymentDetails) === null || _c === void 0 ? void 0 : _c.patientWalletFrozen) !== null && _d !== void 0 ? _d : 0;
            if (frozen > 0 && patientUserId) {
                const patientUser = yield user_model_1.default.findById(patientUserId);
                if (patientUser) {
                    patientUser.unfreezeAmount(frozen);
                    yield patientUser.save();
                }
                if (appointment.paymentDetails) {
                    appointment.paymentDetails.patientWalletFrozen = 0;
                }
            }
        }
        if (status === "accepted") {
            const client = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            const roomName = `online_${appointment._id}`;
            const room = yield client.video.v1.rooms.create({
                uniqueName: roomName,
                type: "group",
                maxParticipants: 2,
            });
            appointment.roomName = room.uniqueName;
        }
        appointment.status = status;
        yield appointment.save();
        const updatedAppointment = yield online_appointment_model_1.default.findById(appointment._id)
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
        });
        if (status === "accepted" || status === "rejected") {
            try {
                const patientInfo = (_e = updatedAppointment === null || updatedAppointment === void 0 ? void 0 : updatedAppointment.patientId) === null || _e === void 0 ? void 0 : _e.userId;
                const doctorInfo = (_f = updatedAppointment === null || updatedAppointment === void 0 ? void 0 : updatedAppointment.doctorId) === null || _f === void 0 ? void 0 : _f.userId;
                if (patientInfo && doctorInfo) {
                    yield (0, appointment_notifications_1.sendAppointmentStatusNotification)({
                        appointmentId: appointment._id.toString(),
                        status: updatedAppointment.status,
                        patientName: `${patientInfo.firstName} ${patientInfo.lastName}`,
                        patientEmail: patientInfo.email,
                        doctorName: `${doctorInfo.firstName} ${doctorInfo.lastName}`,
                        doctorEmail: doctorInfo.email,
                        type: "Online",
                    });
                }
            }
            catch (mailError) {
                console.error("🚨 Failed to send appointment status notification:", mailError);
            }
        }
        res.status(200).json({
            success: true,
            message: `Appointment ${status === "accepted" ? "accepted" : status === "rejected" ? "cancelled" : "updated"} successfully.`,
            action: "confirmOnlineAppointment:success",
            data: updatedAppointment,
        });
    }
    catch (error) {
        console.error("Error confirming online appointment:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't confirm the online appointment. Please try again.",
            action: "confirmOnlineAppointment:error",
        });
    }
});
exports.confirmOnlineAppointment = confirmOnlineAppointment;
/* create room access token */
const AccessToken = twilio_2.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const createRoomAccessToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomName } = req.body;
        if (!roomName) {
            res.status(400).json({
                success: false,
                message: "Room name is required.",
                action: "createRoomAccessToken:missing-room-name",
            });
            return;
        }
        const identity = req.user.id; //user id of user who joined
        // Find the appointment by room name
        const appointment = yield online_appointment_model_1.default.findOne({ roomName });
        if (!appointment || (appointment === null || appointment === void 0 ? void 0 : appointment.status) !== "accepted") {
            res.status(400).json({
                success: false,
                message: "We couldn't find an accepted appointment for this room.",
                action: "createRoomAccessToken:appointment-not-found",
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
                message: "We couldn't find the doctor's user profile.",
                action: "createRoomAccessToken:doctorUser-not-found",
            });
            return;
        }
        const doctorUserId = doctor === null || doctor === void 0 ? void 0 : doctor.userId;
        // patient's user id
        const patient = yield patient_model_1.default.findById(patientId);
        if (!patient) {
            res.status(400).json({
                success: false,
                message: "We couldn't find the patient's user profile.",
                action: "createRoomAccessToken:patientUser-not-found",
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
                action: "createRoomAccessToken:unauthorised",
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
            action: "createRoomAccessToken:success",
            token: jwtToken,
            role: whoJoined,
            identity: `${whoJoined}_${identity}`,
            roomName,
        });
    }
    catch (err) {
        console.error("Failed to generate Twilio access token:", err);
        res.status(500).json({
            success: false,
            message: "We couldn't generate the room access token. Please try again.",
            action: "createRoomAccessToken:error",
        });
    }
});
exports.createRoomAccessToken = createRoomAccessToken;
/* step 3 - doctor joins video call -> reduce unfrozeAmount + wallet from patient, increase wallet of doctor, change paymentStatus of appointment */
const finalPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // room name coming from frontend
        const { roomName } = req.body;
        if (!roomName) {
            res.status(400).json({
                success: false,
                message: "Room name is required.",
                action: "onlineFinalPayment:missing-room-name",
            });
            return;
        }
        // find the appointment with this room name
        const appointment = yield online_appointment_model_1.default.findOne({ roomName });
        if (!appointment) {
            res.status(400).json({
                success: false,
                message: "We couldn't find an appointment for this room.",
                action: "onlineFinalPayment:appointment-not-found",
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
                    success: false,
                    message: "We couldn't find the patient profile.",
                    action: "onlineFinalPayment:patient-not-found",
                });
                return;
            }
            const doctor = yield doctor_model_1.default.findById(appointment.doctorId);
            const doctorUserDetail = yield user_model_1.default.findOne({
                "roleRefs.doctor": appointment.doctorId,
            });
            if (!doctorUserDetail || !doctor) {
                res.status(400).json({
                    success: false,
                    message: "We couldn't find the doctor profile.",
                    action: "onlineFinalPayment:doctor-not-found",
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
                    action: "onlineFinalPayment:no-active-subscription",
                });
                return;
            }
            const subscription = yield doctor_subscription_1.default.findById(activeSub.SubscriptionId);
            if (!subscription) {
                res.status(404).json({
                    success: false,
                    message: "We couldn't find the associated subscription.",
                    action: "onlineFinalPayment:subscription-not-found",
                });
                return;
            }
            // Determine slot key for fee extraction
            let slotKey = `min${((_b = appointment === null || appointment === void 0 ? void 0 : appointment.slot) === null || _b === void 0 ? void 0 : _b.duration) || 15}`;
            let platformFee = subscription.platformFeeOnline &&
                subscription.platformFeeOnline[slotKey]
                ? subscription.platformFeeOnline[slotKey].figure
                : 0;
            let opsExpense = subscription.opsExpenseOnline && subscription.opsExpenseOnline[slotKey]
                ? subscription.opsExpenseOnline[slotKey].figure
                : 0;
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
                    appointment.paymentDetails.doctorPlatformFee = platformFee;
                    appointment.paymentDetails.doctorOpsExpense = opsExpense;
                    appointment.paymentDetails.doctorEarning = incrementAmount;
                    yield appointment.save();
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: "We couldn't process the final payment.",
                        action: "onlineFinalPayment:wallet-deduction-failed",
                    });
                    return;
                }
            }
            res.status(200).json({
                success: true,
                message: "Final payment completed.",
                action: "onlineFinalPayment:success",
            });
            return;
        }
        else if (paymentStatus === "completed") {
            res.status(200).json({
                success: true,
                message: "Final payment is already processed.",
                action: "onlineFinalPayment:already-processed",
            });
            return;
        }
    }
    catch (err) {
        console.error("Error processing final payment:", err);
        res.status(500).json({
            success: false,
            message: "We couldn't process the final payment. Please try again.",
            action: "onlineFinalPayment:error",
        });
    }
});
exports.finalPayment = finalPayment;
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
            message: "All patients retrieved successfully.",
            action: "getAllPatients:success",
            data: {
                patients,
                count: patients.length,
            },
        });
    }
    catch (error) {
        console.error("Error getting all patients:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load patients right now. Please try again.",
            action: "getAllPatients:error",
        });
    }
});
exports.getAllPatients = getAllPatients;
//***** script for cron job
const updateOnlineStatusCron = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        // run the cron at 6:30 PM UTC(12:00 AM IST)
        const appointments = yield online_appointment_model_1.default.find({
            "slot.time.end": { $lt: now },
            status: { $in: ["pending", "accepted"] },
        });
        if (appointments.length === 0) {
            return {
                success: true,
                message: "No online appointments to update.",
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
            message: "Online Statuses updated.",
            summary: { expired, completed, unattended },
        };
    }
    catch (error) {
        console.error("Cron job error in updateOnlineStatusCron:", error);
        return {
            success: false,
            message: "Cron job failed to update online appointments.",
            error: error.message,
        };
    }
});
exports.updateOnlineStatusCron = updateOnlineStatusCron;
