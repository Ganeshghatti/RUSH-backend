import { Request, Response } from "express";
import mongoose from "mongoose";
import twilio from "twilio";
import { jwt } from "twilio";
import OnlineAppointment from "../../models/appointment/online-appointment-model";
import Doctor from "../../models/user/doctor-model";
import Patient from "../../models/user/patient-model";
import User from "../../models/user/user-model";
import DoctorSubscription from "../../models/doctor-subscription";
import { sendNewAppointmentNotification, sendAppointmentStatusNotification } from "../../utils/mail/appointment-notifications";
import { onlineAppointmentBookSchema } from "../../validation/validation";

/* step 1 - Book appointment by patient + Amount freeze*/
export const bookOnlineAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const validationResult = onlineAppointmentBookSchema.safeParse(req.body);
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
    const doctor = await Doctor.findById(doctorId).populate({
      path: "userId",
      select: "firstName lastName email",
    });

    const patientUserDetail = await User.findById(patientUserId);
    if (!patientUserDetail) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your patient's user profile.",
        action: "bookOnlineAppointment:patientUser-not-found",
      });
      return;
    }

    // check if patient exists
    const patient = await Patient.findOne({ userId: patientUserId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your patient profile.",
        action: "bookOnlineAppointment:patient-not-found",
      });
      return;
    }
    const patientId = patient._id;

    const matchedDuration = doctor?.onlineAppointment?.duration.find(
      (item: any) => item.minute === slot.duration
    );
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
    const existingAppointment = await OnlineAppointment.findOne({
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
    const patientAvailableBalance = (
      patientUserDetail as any
    ).getAvailableBalance();
    if (patientAvailableBalance < price) {
      res.status(400).json({
        success: false,
        message: "Your wallet balance is too low for this booking.",
        action: "bookOnlineAppointment:insufficient-balance",
      });
      return;
    }

    // freezing the price of appointment
    const freezeSuccess = (patientUserDetail as any).freezeAmount(price);
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
    await patientUserDetail.save();

    // Create new appointment
    const newAppointment = new OnlineAppointment({
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
    await newAppointment.save();

    try {
      await sendNewAppointmentNotification({
        patientName: patientUserDetail.firstName + ' ' + (patientUserDetail.lastName || ''),
        patientEmail: patientUserDetail.email,
        appointmentId: newAppointment._id.toString(), // Changed from appointment._id to newAppointment._id
        status: newAppointment.status,
        doctorName: (doctor?.userId as any).firstName + ' ' + ((doctor?.userId as any).lastName || ''),
        doctorEmail: (doctor?.userId as any).email,
        type: 'Online',
        scheduledFor: new Date(slot.time.start).toLocaleString(),
      });
      console.log("✅ Doctor online appointment notification sent successfully.");
    } catch (mailError) {
      console.error("🚨 Failed to send online appointment notification:", mailError);
    }


    // Populate the response with detailed patient and doctor information
    const populatedAppointment = await OnlineAppointment.findById(
      newAppointment._id
    )
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
  } catch (error: unknown) {
    console.error("Error booking online appointment:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't book the appointment right now. Please try again.",
      action: "bookOnlineAppointment:error",
    });
  }
};

/* step 2 - Confirm online appointment: doctor can accept/reject, patient can reject (cancel). On reject: unfreeze amount, set cancelledBy. */
export const confirmOnlineAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
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

    const appointment = await OnlineAppointment.findById(appointmentId);
    if (!appointment) {
      res.status(404).json({
        success: false,
        message: "Appointment not found.",
        action: "confirmOnlineAppointment:appointment-not-found",
      });
      return;
    }

    const doctor = await Doctor.findById(appointment.doctorId).select("userId").lean();
    const patient = await Patient.findById(appointment.patientId).select("userId").lean();
    const doctorUserId = doctor?.userId?.toString();
    const patientUserId = patient?.userId?.toString();

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
    } else if (status === "rejected") {
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
      appointment.cancelledBy = new mongoose.Types.ObjectId(userId);
      appointment.cancelledByRole = isDoctor ? "doctor" : "patient";
      const frozen = appointment.paymentDetails?.patientWalletFrozen ?? 0;
      if (frozen > 0 && patientUserId) {
        const patientUser = await User.findById(patientUserId);
        if (patientUser) {
          (patientUser as any).unfreezeAmount(frozen);
          await patientUser.save();
        }
        if (appointment.paymentDetails) {
          appointment.paymentDetails.patientWalletFrozen = 0;
        }
      }
    }

    if (status === "accepted") {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      const roomName = `online_${appointment._id}`;
      const room = await client.video.v1.rooms.create({
        uniqueName: roomName,
        type: "group",
        maxParticipants: 2,
      });
      appointment.roomName = room.uniqueName;
    }

    appointment.status = status;
    await appointment.save();

    const updatedAppointment = await OnlineAppointment.findById(appointment._id)
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
        const patientInfo = (updatedAppointment?.patientId as any)?.userId;
        const doctorInfo = (updatedAppointment?.doctorId as any)?.userId;
        if (patientInfo && doctorInfo) {
          await sendAppointmentStatusNotification({
            appointmentId: appointment._id.toString(),
            status: updatedAppointment!.status,
            patientName: `${patientInfo.firstName} ${patientInfo.lastName}`,
            patientEmail: patientInfo.email,
            doctorName: `${doctorInfo.firstName} ${doctorInfo.lastName}`,
            doctorEmail: doctorInfo.email,
            type: "Online",
          });
        }
      } catch (mailError) {
        console.error("🚨 Failed to send appointment status notification:", mailError);
      }
    }

    res.status(200).json({
      success: true,
      message: `Appointment ${status === "accepted" ? "accepted" : status === "rejected" ? "cancelled" : "updated"} successfully.`,
      action: "confirmOnlineAppointment:success",
      data: updatedAppointment,
    });
  } catch (error: unknown) {
    console.error("Error confirming online appointment:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't confirm the online appointment. Please try again.",
      action: "confirmOnlineAppointment:error",
    });
  }
};

/* create room access token */
const AccessToken = jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
export const createRoomAccessToken = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    const appointment: any = await OnlineAppointment.findOne({ roomName });
    if (!appointment || appointment?.status !== "accepted") {
      res.status(400).json({
        success: false,
        message: "We couldn't find an accepted appointment for this room.",
        action: "createRoomAccessToken:appointment-not-found",
      });
      return;
    }
    const doctorId = appointment?.doctorId;
    const patientId = appointment?.patientId;

    // doctor's user id
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(400).json({
        success: false,
        message: "We couldn't find the doctor's user profile.",
        action: "createRoomAccessToken:doctorUser-not-found",
      });
      return;
    }
    const doctorUserId = doctor?.userId;

    // patient's user id
    const patient = await Patient.findById(patientId);
    if (!patient) {
      res.status(400).json({
        success: false,
        message: "We couldn't find the patient's user profile.",
        action: "createRoomAccessToken:patientUser-not-found",
      });
      return;
    }
    const patientUserId = patient?.userId;

    let whoJoined = "";
    if (identity == doctorUserId) whoJoined = "doctor";
    else if (identity == patientUserId) whoJoined = "patient";
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
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_API_KEY!,
      process.env.TWILIO_API_SECRET!,
      { identity: `${whoJoined}_${identity}` }
    );

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
  } catch (err: unknown) {
    console.error("Failed to generate Twilio access token:", err);
    res.status(500).json({
      success: false,
      message: "We couldn't generate the room access token. Please try again.",
      action: "createRoomAccessToken:error",
    });
  }
};

/* step 3 - doctor joins video call -> reduce unfrozeAmount + wallet from patient, increase wallet of doctor, change paymentStatus of appointment */
export const finalPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    const appointment = await OnlineAppointment.findOne({ roomName });
    if (!appointment) {
      res.status(400).json({
        success: false,
        message: "We couldn't find an appointment for this room.",
        action: "onlineFinalPayment:appointment-not-found",
      });
      return;
    }

    // check payment status of this appointment
    const paymentStatus = appointment.paymentDetails?.paymentStatus;
    if (paymentStatus === "pending") {
      const patient = await Patient.findById(appointment.patientId);
      const patientUserDetail = await User.findOne({
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
      const doctor = await Doctor.findById(appointment.doctorId);
      const doctorUserDetail = await User.findOne({
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
      const activeSub = doctor.subscriptions.find(
        (sub) => !sub.endDate || sub.endDate > now
      );
      if (!activeSub) {
        res.status(400).json({
          success: false,
          message: "The doctor does not have an active subscription.",
          action: "onlineFinalPayment:no-active-subscription",
        });
        return;
      }
      const subscription = await DoctorSubscription.findById(
        activeSub.SubscriptionId
      );
      if (!subscription) {
        res.status(404).json({
          success: false,
          message: "We couldn't find the associated subscription.",
          action: "onlineFinalPayment:subscription-not-found",
        });
        return;
      }

      // Determine slot key for fee extraction
      let slotKey = `min${appointment?.slot?.duration || 15}` as
        | "min15"
        | "min30"
        | "min60";
      let platformFee =
        subscription.platformFeeOnline &&
          subscription.platformFeeOnline[slotKey]
          ? subscription.platformFeeOnline[slotKey]!.figure
          : 0;
      let opsExpense =
        subscription.opsExpenseOnline && subscription.opsExpenseOnline[slotKey]
          ? subscription.opsExpenseOnline[slotKey]!.figure
          : 0;
      // these two are added becasue if doctor subscription does not have platformFeeOnline and expense key(old data) these two will be undefined.
      if (!platformFee) platformFee = 0;
      if (!opsExpense) opsExpense = 0;

      if (appointment.paymentDetails) {
        const deductAmount = appointment.paymentDetails.patientWalletFrozen;
        // deduct forzenAmount as well as wallet from patient user
        const deductSuccess = (patientUserDetail as any).deductFrozenAmount(
          deductAmount
        );
        if (deductSuccess) {
          await patientUserDetail.save();
          // appointment?.paymentDetails?.paymentStatus = "completed"; we are not marking the appointment complete here because this api is called as soon as doctor joins the online video.

          // increment in doctor user
          let incrementAmount =
            deductAmount - platformFee - (deductAmount * opsExpense) / 100;
          if (incrementAmount < 0) incrementAmount = 0;
          doctorUserDetail.wallet += incrementAmount;
          await doctorUserDetail.save();

          appointment.paymentDetails.paymentStatus = "completed";
          appointment.paymentDetails.patientWalletDeducted = deductAmount;
          appointment.paymentDetails.patientWalletFrozen -= deductAmount;

          appointment.paymentDetails.doctorPlatformFee = platformFee;
          appointment.paymentDetails.doctorOpsExpense = opsExpense;
          appointment.paymentDetails.doctorEarning = incrementAmount;

          await appointment.save();
        } else {
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
    } else if (paymentStatus === "completed") {
      res.status(200).json({
        success: true,
        message: "Final payment is already processed.",
        action: "onlineFinalPayment:already-processed",
      });
      return;
    }
  } catch (err: unknown) {
    console.error("Error processing final payment:", err);
    res.status(500).json({
      success: false,
      message: "We couldn't process the final payment. Please try again.",
      action: "onlineFinalPayment:error",
    });
  }
};

// Get all patients with populated user details
export const getAllPatients = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Find all patients and populate user details
    const patients = await Patient.find({})
      .populate({
        path: "userId",
        select:
          "firstName lastName email phone countryCode gender profilePic dob address wallet prefix phoneVerified personalIdProof addressProof bankDetails taxProof isDocumentVerified createdAt",
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
  } catch (error: unknown) {
    console.error("Error getting all patients:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load patients right now. Please try again.",
      action: "getAllPatients:error",
    });
  }
};

//***** script for cron job
export const updateOnlineStatusCron = async () => {
  try {
    const now = new Date();

    // run the cron at 6:30 PM UTC(12:00 AM IST)
    const appointments = await OnlineAppointment.find({
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

      const patientUserDetail = await User.findOne({
        "roleRefs.patient": patientId,
      });
      if (!patientUserDetail) {
        console.warn("Patient user not found for appointment:", appt._id);
        continue;
      }

      // pending -> expired
      if (status === "pending") {
        appt.status = "expired";

        const unFreezeSuccess = (patientUserDetail as any).unfreezeAmount(
          paymentDetails?.patientWalletFrozen
        );
        if (!unFreezeSuccess) {
          console.warn("Unfreeze failed for appointment:", appt._id);
          continue;
        }

        await patientUserDetail.save();
        if (appt.paymentDetails) {
          appt.paymentDetails.patientWalletFrozen = 0;
        }
        expired++;
      }
      // accepted → completed or unattended
      else if (status === "accepted") {
        if (paymentDetails?.paymentStatus === "completed") {
          appt.status = "completed";
          completed++;
        } else {
          appt.status = "unattended";
          const unFreezeSuccess = (patientUserDetail as any).unfreezeAmount(
            paymentDetails?.patientWalletFrozen
          );
          if (!unFreezeSuccess) {
            console.warn("Unfreeze failed for appointment:", appt._id);
            continue;
          }
          await patientUserDetail.save();
          if (appt.paymentDetails) {
            appt.paymentDetails.patientWalletFrozen = 0;
          }
          unattended++;
        }
      }

      await appt.save();
    }

    return {
      success: true,
      message: "Online Statuses updated.",
      summary: { expired, completed, unattended },
    };
  } catch (error) {
    console.error("Cron job error in updateOnlineStatusCron:", error);
    return {
      success: false,
      message: "Cron job failed to update online appointments.",
      error: (error as Error).message,
    };
  }
};
