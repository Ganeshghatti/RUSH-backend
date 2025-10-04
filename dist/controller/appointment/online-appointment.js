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
exports.updateAppointmentExpiredStatus = exports.getAllPatients = exports.getDoctorAppointmentByDate = exports.finalPayment = exports.createRoomAccessToken = exports.updateAppointmentStatus = exports.getPatientAppointments = exports.getDoctorAppointments = exports.bookOnlineAppointment = void 0;
const twilio_1 = __importDefault(require("twilio"));
const twilio_2 = require("twilio");
const online_appointment_model_1 = __importDefault(require("../../models/appointment/online-appointment-model"));
const homevisit_appointment_model_1 = __importDefault(require("../../models/appointment/homevisit-appointment-model"));
const emergency_appointment_model_1 = __importDefault(require("../../models/appointment/emergency-appointment-model"));
const clinic_appointment_model_1 = __importDefault(require("../../models/appointment/clinic-appointment-model"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const doctor_subscription_1 = __importDefault(require("../../models/doctor-subscription"));
/* Book appointment by patient + Amount freeze*/
const bookOnlineAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { doctorId, slot } = req.body;
        const patientUserId = req.user.id;
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
        // Check if patient user exists
        const patientUserDetail = yield user_model_1.default.findById(patientUserId);
        if (!patientUserDetail) {
            res.status(404).json({
                success: false,
                message: "Patient User not found",
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
        // check available balance = (wallet - frozenAmount)
        const patientAvailableBalance = patientUserDetail.getAvailableBalance();
        if (patientAvailableBalance < price) {
            res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
            });
            return;
        }
        // freezing the price of appointment
        const freezeSuccess = patientUserDetail.freezeAmount(price);
        if (!freezeSuccess) {
            res.status(400).json({
                success: false,
                message: "Error freezing amount in wallet",
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
            patientId: patientUserId,
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
        const now = new Date();
        // Helper function to update appointment statuses
        const updateStatuses = (appointments, Model) => __awaiter(void 0, void 0, void 0, function* () {
            const updates = appointments.map((appt) => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                const endDate = new Date((_b = (_a = appt.slot) === null || _a === void 0 ? void 0 : _a.time) === null || _b === void 0 ? void 0 : _b.end); // assuming slot.time.end exists
                if (endDate && endDate < now) {
                    if (appt.status === "pending") {
                        appt.status = "expired";
                        yield Model.updateOne({ _id: appt._id }, { status: "cancelled" });
                    }
                    else if (appt.status === "accepted") {
                        appt.status = "completed";
                        yield Model.updateOne({ _id: appt._id }, { status: "completed" });
                    }
                }
                return appt;
            }));
            return Promise.all(updates);
        });
        // Find all online appointments for this doctor
        let onlineAppointments = yield online_appointment_model_1.default.find({
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
        onlineAppointments = yield updateStatuses(onlineAppointments, online_appointment_model_1.default);
        // Find all emergency appointments for this doctor
        let emergencyAppointments = yield emergency_appointment_model_1.default.find({
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
        emergencyAppointments = yield updateStatuses(emergencyAppointments, emergency_appointment_model_1.default);
        // Find all clinic appointments for this doctor
        let clinicAppointments = yield clinic_appointment_model_1.default.find({
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
        clinicAppointments = yield updateStatuses(clinicAppointments, clinic_appointment_model_1.default);
        // Find all home visit appointments for this doctor
        let homeVisitAppointments = yield homevisit_appointment_model_1.default.find({
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
        homeVisitAppointments = yield updateStatuses(homeVisitAppointments, homevisit_appointment_model_1.default);
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
        const now = new Date();
        // Helper function to update appointment statuses
        const updateStatuses = (appointments, Model) => __awaiter(void 0, void 0, void 0, function* () {
            const updates = appointments.map((appt) => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                const endDate = new Date((_b = (_a = appt.slot) === null || _a === void 0 ? void 0 : _a.time) === null || _b === void 0 ? void 0 : _b.end); // assuming slot.time.end exists
                if (endDate && endDate < now) {
                    if (appt.status === "pending") {
                        appt.status = "expired";
                        yield Model.updateOne({ _id: appt._id }, { status: "cancelled" });
                    }
                    else if (appt.status === "accepted") {
                        appt.status = "completed";
                        yield Model.updateOne({ _id: appt._id }, { status: "completed" });
                    }
                }
                return appt;
            }));
            return Promise.all(updates);
        });
        // Find all online appointments for this patient (patientId references User)
        let onlineAppointments = yield online_appointment_model_1.default.find({
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
        onlineAppointments = yield updateStatuses(onlineAppointments, online_appointment_model_1.default);
        // Find all emergency appointments for this patient (patientId references Patient)
        let emergencyAppointments = yield emergency_appointment_model_1.default.find({
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
        emergencyAppointments = yield updateStatuses(emergencyAppointments, emergency_appointment_model_1.default);
        // Find all clinic appointments for this patient
        let clinicAppointments = yield clinic_appointment_model_1.default.find({
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
        clinicAppointments = yield updateStatuses(clinicAppointments, clinic_appointment_model_1.default);
        // Find all home visit appointments for this patient
        let homeVisitAppointments = yield homevisit_appointment_model_1.default.find({
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
        homeVisitAppointments = yield updateStatuses(homeVisitAppointments, homevisit_appointment_model_1.default);
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
/* Update appointment status by doctor (if accept -> create twilio room, if reject -> unfreeze amount) */
const updateAppointmentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { appointmentId } = req.params;
        const { status } = req.body;
        const doctorUserId = req.user.id;
        // Validate status
        if (!status || !["pending", "accepted", "rejected"].includes(status)) {
            res.status(400).json({
                success: false,
                message: "Valid status (pending, accepted, rejected) is required",
            });
            return;
        }
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorUserId });
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
        // if status is reject unfreeze the amount from patient's user wallet.
        if (status === "rejected" || status === "cancel") {
            const patientUserId = appointment.patientId;
            const patientUserDetail = yield user_model_1.default.findById(patientUserId);
            if (!patientUserDetail) {
                res.status(400).json({
                    success: false,
                    message: "Patient not found",
                });
                return;
            }
            const amount = (_a = appointment.paymentDetails) === null || _a === void 0 ? void 0 : _a.patientWalletFrozen;
            const unfreezeSuccess = patientUserDetail.unfreezeAmount(amount);
            if (unfreezeSuccess) {
                yield patientUserDetail.save();
            }
            else {
                res.status(400).json({
                    success: false,
                    message: "Error in adding frozen amount in patient wallet.",
                });
                return;
            }
        }
        // if status is accepted create room
        const client = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        if (status === "accepted") {
            const roomName = `online_${appointment._id}`;
            const room = yield client.video.v1.rooms.create({
                uniqueName: roomName,
                type: "group",
                maxParticipants: 2,
            });
            console.log("Room created:", roomName);
            appointment.roomName = room.uniqueName;
        }
        // Update status of the appointment
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
/* cancel appointment by patient */
// export const cancelAppointment = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { appointmentId } = req.params;
//     console.log("Appointment Id ", appointmentId);
//     const user_Id = req.user.id;
//     console.log("User ", user_Id);
//     const appointment = await OnlineAppointment.findOne({
//       _id: appointmentId,
//     });
//     if (!appointment) {
//       res.status(404).json({
//         success: false,
//         message: "Appointment not found in DB.",
//       });
//       return;
//     }
//     if (!appointment.slot?.time?.start) {
//       res.status(400).json({
//         success: false,
//         message: "Appointment has no start time",
//       });
//       return;
//     }
//     const curr = Date.now();
//     const appointmentStartTime = new Date(
//       appointment.slot?.time?.start
//     ).getTime();
//     if (curr > appointmentStartTime) {
//       res.status(404).json({
//         success: false,
//         message: "Appointment can't be cancelled after start time",
//       });
//       return;
//     }
//     appointment.status = "cancelled";
//     await appointment.save();
//     const updatedAppointment = await OnlineAppointment.findById(
//       appointment._id
//     );
//     res.status(200).json({
//       success: true,
//       data: updatedAppointment,
//       message: `Appointment cancelled successfully`,
//     });
//   } catch (err: any) {
//     console.error("Error cancelling appointment: ", err);
//     res.status(500).json({
//       success: false,
//       message: "Error cancelling appointment",
//       error: err.message,
//     });
//   }
// };
/* create room access token */
const AccessToken = twilio_2.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const createRoomAccessToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomName } = req.body;
        if (!roomName) {
            res
                .status(400)
                .json({ success: false, message: "Room name is required" });
            return;
        }
        const identity = req.user.id; //user id of user who joined
        // finding the appointment using rommName
        const appointment = yield online_appointment_model_1.default.findOne({ roomName });
        // if (!appointment) {
        if (!appointment || (appointment === null || appointment === void 0 ? void 0 : appointment.status) !== "accepted") {
            res.status(400).json({
                success: false,
                message: "Appointment not found in DB or appointment is not accepted",
            });
            return;
        }
        const doctorId = appointment === null || appointment === void 0 ? void 0 : appointment.doctorId;
        const patientUserId = appointment === null || appointment === void 0 ? void 0 : appointment.patientId;
        // doctor's user id
        const doctor = yield doctor_model_1.default.findById(doctorId);
        if (!doctor) {
            res.status(400).json({
                success: false,
                message: "Doctor not found in DB",
            });
            return;
        }
        const doctorUserId = doctor === null || doctor === void 0 ? void 0 : doctor.userId;
        let whoJoined = "";
        if (identity == doctorUserId)
            whoJoined = "doctor";
        else if (identity == patientUserId)
            whoJoined = "patient";
        if (!whoJoined) {
            res.status(403).json({
                success: false,
                message: "You are not authorized to join this room",
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
            token: jwtToken,
            role: whoJoined,
            identity: `${whoJoined}_${identity}`,
            roomName,
        });
    }
    catch (err) {
        console.error("Failed to generate Twilio access token:", err);
        res
            .status(500)
            .json({ success: false, message: "Token generation failed" });
    }
});
exports.createRoomAccessToken = createRoomAccessToken;
/* doctor joins video call -> reduce unfrozeAmount + wallet from patient, increase wallet of doctor, change paymentStatus of appointment */
const finalPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // room name coming from frontend
        const { roomName } = req.body;
        if (!roomName) {
            res.status(400).json({
                success: false,
                message: "Missing room name",
            });
            return;
        }
        console.log('ROOM NAME ', roomName);
        // find the appointment with this room name
        const appointment = yield online_appointment_model_1.default.findOne({ roomName });
        if (!appointment) {
            res.status(400).json({
                success: false,
                message: "This appointment does not exist in DB.",
            });
            return;
        }
        // check payment status of this appointment
        const paymentStatus = (_a = appointment.paymentDetails) === null || _a === void 0 ? void 0 : _a.paymentStatus;
        if (paymentStatus === "pending") {
            const patientUserDetail = yield user_model_1.default.findById(appointment.patientId);
            if (!patientUserDetail) {
                res.status(400).json({
                    sucess: false,
                    message: "Patient User not found.",
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
                    message: "Doctor or doctor user not found.",
                });
                return;
            }
            //***** Find doctor subscription to get info of the fee deduction *****\\
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
                    yield appointment.save();
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: "Failed to process final payment",
                    });
                    return;
                }
            }
            res.status(200).json({
                success: true,
                message: "Final payment completed",
            });
            return;
        }
        else if (paymentStatus === "completed") {
            res.status(200).json({
                sucess: true,
                message: "Final payment is already processed.",
            });
            return;
        }
    }
    catch (err) {
        console.error("Error processing final payment: ", err);
        res.status(500).json({
            success: false,
            message: "Error in processing final payment",
            error: err.message,
        });
    }
});
exports.finalPayment = finalPayment;
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
