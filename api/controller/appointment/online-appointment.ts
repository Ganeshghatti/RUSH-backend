import { Request, Response } from "express";
import twilio from "twilio";
import { jwt } from "twilio";
import OnlineAppointment from "../../models/appointment/online-appointment-model";
import HomeVisitAppointment from "../../models/appointment/homevisit-appointment-model";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import ClinicAppointment from "../../models/appointment/clinic-appointment-model";
import Doctor from "../../models/user/doctor-model";
import Patient from "../../models/user/patient-model";
import User from "../../models/user/user-model";
import DoctorSubscription from "../../models/doctor-subscription";
import { sendNewAppointmentNotification } from "../../utils/mail/appointment-notifications";

/* Book appointment by patient + Amount freeze*/
export const bookOnlineAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    const doctor = await Doctor.findById(doctorId).populate({
      path: "userId",
      select: "firstName lastName email",
    });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Check if patient user exists
    const patientUserDetail = await User.findById(patientUserId);
    if (!patientUserDetail) {
      res.status(404).json({
        success: false,
        message: "Patient User not found",
      });
      return;
    }

    const matchedDuration = doctor?.onlineAppointment?.duration.find(
      (item: any) => item.minute === slot.duration
    );
    if (!matchedDuration) {
      res.status(400).json({
        success: false,
        message: "Doctor does not offer this duration",
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
        message: "This slot is already booked",
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
        message: "Insufficient wallet balance",
      });
      return;
    }

    // freezing the price of appointment
    const freezeSuccess = (patientUserDetail as any).freezeAmount(price);
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
    await patientUserDetail.save();

    // Create new appointment
    const newAppointment = new OnlineAppointment({
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
    await newAppointment.save();

    try {
      await sendNewAppointmentNotification({
        patientName: patientUserDetail.firstName + ' ' + (patientUserDetail.lastName || ''),
        patientEmail: patientUserDetail.email,
        appointmentId: newAppointment._id.toString(), // Changed from appointment._id to newAppointment._id
        status: newAppointment.status,
        doctorName: (doctor.userId as any).firstName + ' ' + ((doctor.userId as any).lastName || ''),
        doctorEmail: (doctor.userId as any).email,
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
  } catch (error: any) {
    console.error("Error booking online appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error booking appointment",
      error: error.message,
    });
  }
};

// Get all appointments for doctor
export const getDoctorAppointments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const doctorId = req.user.id; // Assuming the logged-in user is a doctor

    const doctor = await Doctor.findOne({ userId: doctorId });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    const now = new Date();

    // Helper function to update appointment statuses
    const updateStatuses = async (appointments: any[], Model: any) => {
      const updates = appointments.map(async (appt) => {
        const endDate = new Date(appt.slot?.time?.end); // assuming slot.time.end exists
        if (endDate && endDate < now) {
          if (appt.status === "pending") {
            appt.status = "expired";
            await Model.updateOne({ _id: appt._id }, { status: "cancelled" });
          } else if (appt.status === "accepted") {
            appt.status = "completed";
            await Model.updateOne({ _id: appt._id }, { status: "completed" });
          }
        }
        return appt;
      });
      return Promise.all(updates);
    };

    // Find all online appointments for this doctor
    let onlineAppointments = await OnlineAppointment.find({
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

    onlineAppointments = await updateStatuses(
      onlineAppointments,
      OnlineAppointment
    );

    // Find all emergency appointments for this doctor
    let emergencyAppointments = await EmergencyAppointment.find({
      doctorId: doctor._id,
    })
      .populate({
        path: "patientId",
        select: "userId healthMetrics insurance mapLocation",
        populate: {
          path: "userId",
          select:
            "firstName lastName countryCode gender email profilePic phone dob address wallet",
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

    emergencyAppointments = await updateStatuses(
      emergencyAppointments,
      EmergencyAppointment
    );

    // Find all clinic appointments for this doctor
    let clinicAppointments = await ClinicAppointment.find({
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

    clinicAppointments = await updateStatuses(
      clinicAppointments,
      ClinicAppointment
    );

    // Find all home visit appointments for this doctor
    let homeVisitAppointments = await HomeVisitAppointment.find({
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

    homeVisitAppointments = await updateStatuses(
      homeVisitAppointments,
      HomeVisitAppointment
    );

    res.status(200).json({
      success: true,
      onlineAppointment: onlineAppointments,
      emergencyAppointment: emergencyAppointments,
      clinicAppointment: clinicAppointments,
      homevisitAppointment: homeVisitAppointments,
      message: "Doctor appointments retrieved successfully",
    });
  } catch (error: any) {
    console.error("Error getting doctor appointments:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving appointments",
      error: error.message,
    });
  }
};

// Get all appointments for patient
export const getPatientAppointments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id; // Assuming the logged-in user is a patient

    // Find the patient record
    const patient = await Patient.findOne({ userId });

    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    const now = new Date();

    // Helper function to update appointment statuses
    const updateStatuses = async (appointments: any[], Model: any) => {
      const updates = appointments.map(async (appt) => {
        const endDate = new Date(appt.slot?.time?.end); // assuming slot.time.end exists
        if (endDate && endDate < now) {
          if (appt.status === "pending") {
            appt.status = "expired";
            await Model.updateOne({ _id: appt._id }, { status: "cancelled" });
          } else if (appt.status === "accepted") {
            appt.status = "completed";
            await Model.updateOne({ _id: appt._id }, { status: "completed" });
          }
        }
        return appt;
      });
      return Promise.all(updates);
    };

    // Find all online appointments for this patient (patientId references User)
    let onlineAppointments = await OnlineAppointment.find({
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

    onlineAppointments = await updateStatuses(
      onlineAppointments,
      OnlineAppointment
    );

    // Find all emergency appointments for this patient (patientId references Patient)
    let emergencyAppointments = await EmergencyAppointment.find({
      patientId: patient._id,
    })
      .populate({
        path: "patientId",
        select: "userId healthMetrics insurance mapLocation",
        populate: {
          path: "userId",
          select:
            "firstName lastName countryCode gender email profilePic phone dob address wallet",
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

    emergencyAppointments = await updateStatuses(
      emergencyAppointments,
      EmergencyAppointment
    );

    // Find all clinic appointments for this patient
    let clinicAppointments = await ClinicAppointment.find({
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

    clinicAppointments = await updateStatuses(
      clinicAppointments,
      ClinicAppointment
    );

    // Find all home visit appointments for this patient
    let homeVisitAppointments = await HomeVisitAppointment.find({
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

    homeVisitAppointments = await updateStatuses(
      homeVisitAppointments,
      HomeVisitAppointment
    );

    res.status(200).json({
      success: true,
      onlineAppointment: onlineAppointments,
      emergencyAppointment: emergencyAppointments,
      clinicAppointment: clinicAppointments,
      homevisitAppointment: homeVisitAppointments,
      message: "Patient appointments retrieved successfully",
    });
  } catch (error: any) {
    console.error("Error getting patient appointments:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving appointments",
      error: error.message,
    });
  }
};

/* Update appointment status by doctor (if accept -> create twilio room, if reject -> unfreeze amount) */
export const updateAppointmentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
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

    const doctor = await Doctor.findOne({ userId: doctorUserId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Find the appointment and verify it belongs to this doctor
    const appointment = await OnlineAppointment.findOne({
      _id: appointmentId,
      doctorId: doctor._id,
    });
    if (!appointment) {
      res.status(404).json({
        success: false,
        message:
          "Appointment not found or you don't have permission to modify it",
      });
      return;
    }

    // if status is reject unfreeze the amount from patient's user wallet.
    if (status === "rejected" || status === "cancel") {
      const patientUserId = appointment.patientId;
      const patientUserDetail = await User.findById(patientUserId);
      if (!patientUserDetail) {
        res.status(400).json({
          success: false,
          message: "Patient not found",
        });
        return;
      }

      const amount = appointment.paymentDetails?.patientWalletFrozen;

      const unfreezeSuccess = (patientUserDetail as any).unfreezeAmount(amount);
      if (unfreezeSuccess) {
        await patientUserDetail.save();
      } else {
        res.status(400).json({
          success: false,
          message: "Error in adding frozen amount in patient wallet.",
        });
        return;
      }
    }

    // if status is accepted create room
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    if (status === "accepted") {
      const roomName = `online_${appointment._id}`;
      const room = await client.video.v1.rooms.create({
        uniqueName: roomName,
        type: "group",
        maxParticipants: 2,
      });
      console.log("Room created:", roomName);
      appointment.roomName = room.uniqueName;
    }

    // Update status of the appointment
    appointment.status = status;
    await appointment.save();

    // Populate the response with detailed patient and doctor information
    const updatedAppointment = await OnlineAppointment.findById(appointment._id)
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
  } catch (error: any) {
    console.error("Error updating appointment status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating appointment status",
      error: error.message,
    });
  }
};

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
const AccessToken = jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
export const createRoomAccessToken = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    const appointment: any = await OnlineAppointment.findOne({ roomName });
    // if (!appointment) {
    if (!appointment || appointment?.status !== "accepted") {
      res.status(400).json({
        success: false,
        message: "Appointment not found in DB or appointment is not accepted",
      });
      return;
    }
    const doctorId = appointment?.doctorId;
    const patientUserId = appointment?.patientId;

    // doctor's user id
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(400).json({
        success: false,
        message: "Doctor not found in DB",
      });
      return;
    }
    const doctorUserId = doctor?.userId;

    let whoJoined = "";
    if (identity == doctorUserId) whoJoined = "doctor";
    else if (identity == patientUserId) whoJoined = "patient";
    if (!whoJoined) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to join this room",
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
      token: jwtToken,
      role: whoJoined,
      identity: `${whoJoined}_${identity}`,
      roomName,
    });
  } catch (err) {
    console.error("Failed to generate Twilio access token:", err);
    res
      .status(500)
      .json({ success: false, message: "Token generation failed" });
  }
};

/* doctor joins video call -> reduce unfrozeAmount + wallet from patient, increase wallet of doctor, change paymentStatus of appointment */
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
        message: "Missing room name",
      });
      return;
    }
    console.log('ROOM NAME ', roomName)

    // find the appointment with this room name
    const appointment = await OnlineAppointment.findOne({ roomName });
    if (!appointment) {
      res.status(400).json({
        success: false,
        message: "This appointment does not exist in DB.",
      });
      return;
    }

    // check payment status of this appointment
    const paymentStatus = appointment.paymentDetails?.paymentStatus;
    if (paymentStatus === "pending") {
      const patientUserDetail = await User.findById(appointment.patientId);
      if (!patientUserDetail) {
        res.status(400).json({
          sucess: false,
          message: "Patient User not found.",
        });
        return;
      }
      const doctor = await Doctor.findById(appointment.doctorId);
      const doctorUserDetail = await User.findOne({
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
      const activeSub = doctor.subscriptions.find(
        (sub) => !sub.endDate || sub.endDate > now
      );
      if (!activeSub) {
        res.status(400).json({
          success: false,
          message: "Doctor has no active subscription",
        });
        return;
      }
      const subscription = await DoctorSubscription.findById(
        activeSub.SubscriptionId
      );
      if (!subscription) {
        res.status(404).json({
          success: false,
          message: "Subscription not found",
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
          await appointment.save();
        } else {
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
    } else if (paymentStatus === "completed") {
      res.status(200).json({
        sucess: true,
        message: "Final payment is already processed.",
      });
      return;
    }
  } catch (err: any) {
    console.error("Error processing final payment: ", err);
    res.status(500).json({
      success: false,
      message: "Error in processing final payment",
      error: err.message,
    });
  }
};

export const getDoctorAppointmentByDate = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    const doctor = await Doctor.findOne({ userId: doctorId });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Create date range for the specified date
    const startDate = new Date(date as string);
    const endDate = new Date(date as string);
    endDate.setDate(endDate.getDate() + 1); // Next day

    // Find all appointments for this doctor on the specified date
    const appointments = await OnlineAppointment.find({
      doctorId: doctor._id,
      "slot.day": {
        $gte: startDate,
        $lt: endDate,
      },
    })
      .populate({
        path: "patientId",
        select:
          "firstName lastName email phone countryCode gender profilePic dob address wallet",
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
  } catch (error: any) {
    console.error("Error getting doctor appointments by date:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving appointments by date",
      error: error.message,
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
      data: patients,
      message: "All patients retrieved successfully",
      count: patients.length,
    });
  } catch (error: any) {
    console.error("Error getting all patients:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving patients",
      error: error.message,
    });
  }
};

// script for cron job
export const updateAppointmentExpiredStatus = async () => {
  try {
    const now = new Date();

    // Find appointments that have passed their slot end time and are still pending or accepted
    const expiredAppointments = await OnlineAppointment.find({
      "slot.time.end": { $lt: now },
      status: { $in: ["pending", "accepted"] },
    });

    if (expiredAppointments.length > 0) {
      const updateResult = await OnlineAppointment.updateMany(
        {
          "slot.time.end": { $lt: now },
          status: { $in: ["pending", "accepted"] },
        },
        {
          $set: { status: "expired" },
        }
      );

      console.log(`Updated ${updateResult.modifiedCount} expired appointments`);
    }
  } catch (error: any) {
    console.error("Error updating expired appointments:", error.message);
  }
};
