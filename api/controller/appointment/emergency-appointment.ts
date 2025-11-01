import { Request, Response } from "express";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import Patient from "../../models/user/patient-model";
import Doctor from "../../models/user/doctor-model";
import User from "../../models/user/user-model";
import { createEmergencyAppointmentSchema } from "../../validation/validation";
import twilio from "twilio";
import { jwt } from "twilio";
import { GetSignedUrl } from "../../utils/aws_s3/upload-media";
import DoctorSubscription from "../../models/doctor-subscription";
import { transporter } from "../../config/email-transporter";
import { sendAdminEmergencyNotification } from "../../utils/mail/emergency_appointments";
import { sendAppointmentStatusNotification } from "../../utils/mail/appointment-notifications";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Helper function to convert media keys and profile pic to signed URLs
export const convertMediaKeysToUrls = async (appointments: any[]) => {
  return Promise.all(
    appointments.map(async (appointment) => {
      const appointmentObj = appointment.toObject();

      // Convert media keys to signed URLs
      if (appointmentObj.media && appointmentObj.media.length > 0) {
        try {
          appointmentObj.media = await Promise.all(
            appointmentObj.media.map(async (key: string) => {
              try {
                return await GetSignedUrl(key);
              } catch (error) {
                console.error(
                  `Error generating signed URL for key ${key}:`,
                  error
                );
                return key; // Return original key if URL generation fails
              }
            })
          );
        } catch (error) {
          console.error("Error processing media URLs:", error);
        }
      }

      // Convert profile pic to signed URL
      if (appointmentObj.patientId?.userId?.profilePic) {
        try {
          appointmentObj.patientId.userId.profilePic = await GetSignedUrl(
            appointmentObj.patientId.userId.profilePic
          );
        } catch (error) {
          console.error(
            `Error generating signed URL for profile pic ${appointmentObj.patientId.userId.profilePic}:`,
            error
          );
          // Keep original key if URL generation fails
        }
      }

      return appointmentObj;
    })
  );
};

/* create emergency appointment when patient requests + freeze 2500*/
export const createEmergencyAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validate request body
    const validationResult = createEmergencyAppointmentSchema.safeParse(
      req.body
    );
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
      return;
    }
    const { title, description, media, location, contactNumber, name } =
      validationResult.data;

    const patientUserId = req.user.id;

    // Find patient by userId
    const patient = await Patient.findOne({ userId: patientUserId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    // Check user's wallet balance
    const patientUserDetail = await User.findById(patientUserId);
    if (!patientUserDetail) {
      res.status(404).json({
        success: false,
        message: "Patient User not found",
      });
      return;
    }

    // Check if user has sufficient balance (2500)
    const patientAvailableBalance = (
      patientUserDetail as any
    ).getAvailableBalance();
    if (patientAvailableBalance < 2500) {
      res.status(400).json({
        success: false,
        message:
          "Insufficient wallet balance. Please add money to your wallet. Required balance: ₹2500",
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
    const freezeSuccess = (patientUserDetail as any).freezeAmount(2500);
    if (!freezeSuccess) {
      res.status(400).json({
        success: false,
        message: "Error freezing amount in wallet",
      });
      return;
    }
    await patientUserDetail.save();

    // Create new emergency appointment
    const newEmergencyAppointment = new EmergencyAppointment({
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
    await newEmergencyAppointment.save();

    // try {
    //   const adminEmail = "vijayjoshi5410@gmail.com";

    //   const adminMailOptions = {
    //     from: process.env.SMTP_USER,
    //     to: adminEmail,
    //     subject: "New Emergency Appointment Created",
    //     html: `
    //       <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
    //         <div style="max-width: 520px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 24px;">
    //           <h2 style="color: #e53935; margin: 0 0 12px;">🚨 New Emergency Appointment</h2>
    //           <p style="margin: 0 0 6px;"><b>Patient Name:</b> ${name}</p>
    //           <p style="margin: 0 0 6px;"><b>Contact Number:</b> ${contactNumber}</p>
    //           <p style="margin: 0 0 6px;"><b>Location:</b> ${location}</p>
    //           <p style="margin: 0 0 6px;"><b>Title:</b> ${title}</p>
    //           <p style="margin: 0 0 12px;"><b>Description:</b> ${description}</p>
    //           <p style="margin: 0 0 12px; color:#666; font-size: 13px;"><b>Created At:</b> ${new Date().toLocaleString()}</p>
    //           <hr style="margin: 16px 0;">
    //           <p style="color: #777; font-size: 13px; margin:0;">
    //             This is an automated alert from <b>RUSHDR</b> — please assign a doctor immediately.
    //           </p>
    //         </div>
    //       </div>
    //     `,
    //   } as any;

    //   console.log("Attempting to send admin emergency email to:", adminEmail);
    //   await transporter.sendMail(adminMailOptions)
    //     .then(() => console.log("Admin emergency email sent to:", adminEmail))
    //     .catch((err) => {
    //       console.error("Admin email send failed:", err?.message || err);
    //     });

    //   // Patient acknowledgement (if email available)
    //   try {
    //     const patientEmail = (patientUserDetail as any)?.email;
    //     if (patientEmail) {
    //       const patientMailOptions = {
    //         from: process.env.SMTP_USER,
    //         to: patientEmail,
    //         subject: "We received your emergency request",
    //         html: `
    //           <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
    //             <div style="max-width: 520px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 24px;">
    //               <h2 style="color: #1a73e8; margin: 0 0 12px;">Emergency request received</h2>
    //               <p style="margin: 0 0 8px;">Hi ${name || "there"},</p>
    //               <p style="margin: 0 0 12px;">Your emergency request has been received. A doctor will be assigned shortly.</p>
    //               <p style="margin: 0 0 6px;"><b>Title:</b> ${title}</p>
    //               <p style="margin: 0 0 6px;"><b>Description:</b> ${description}</p>
    //               <p style="margin: 0 0 6px;"><b>Contact:</b> ${contactNumber}</p>
    //               <p style="margin: 0 0 12px;"><b>Location:</b> ${location}</p>
    //               <hr style="margin: 16px 0;">
    //               <p style="font-size: 12px; color: #888; margin: 0;">If this wasn’t you, please ignore this email.</p>
    //             </div>
    //           </div>
    //         `,
    //       } as any;
    //       console.log("Attempting to send patient emergency email to:", patientEmail);
    //       await transporter.sendMail(patientMailOptions)
    //         .then(() => console.log("Patient emergency email sent to:", patientEmail))
    //         .catch((err) => {
    //           console.error("Patient email send failed:", err?.message || err);
    //         });
    //     }
    //   } catch (patientEmailErr) {
    //     console.error("Failed to send patient acknowledgement:", patientEmailErr);
    //   }
    // } catch (emailError) {
    //   console.error("Failed to send emergency appointment emails:", emailError);
    // }
    try {
      // Validate before sending email
      if (!name || !title || !description || !contactNumber || !location) {
        console.error("❌ Missing required emergency appointment details.");
        throw new Error("All fields (name, title, description, contactNumber, location) are required to send an emergency notification.");
      }

      // Send admin notification
      await sendAdminEmergencyNotification({
        name,
        title,
        description,
        contactNumber,
        location,
      });

      console.log("✅ Admin emergency notification sent successfully.");

    } catch (emailError: any) {
      console.error("🚨 Failed to send emergency appointment email:", emailError.message || emailError);
    }


    // Populate the response with patient information
    const populatedAppointment = await EmergencyAppointment.findById(
      newEmergencyAppointment._id
    ).populate({
      path: "patientId",
      select: "userId",
      populate: {
        path: "userId",
        select: "firstName lastName countryCode phone email profilePic",
      },
    });

    // Convert media keys to signed URLs
    const appointmentsWithUrls = await convertMediaKeysToUrls([
      populatedAppointment,
    ]);

    res.status(201).json({
      success: true,
      data: appointmentsWithUrls[0],
      message: "Emergency appointment created successfully",
    });
  } catch (error: any) {
    console.error("Error creating emergency appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error creating emergency appointment",
      error: error.message,
    });
  }
};

export const getAllEmergencyAppointments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Find all emergency appointments with pending status
    const appointments = await EmergencyAppointment.find({ status: "pending" })
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
    const appointmentsWithUrls = await convertMediaKeysToUrls(appointments);

    res.status(200).json({
      success: true,
      data: appointmentsWithUrls,
      count: appointmentsWithUrls.length,
      message: "Emergency appointments retrieved successfully",
    });
  } catch (error: any) {
    console.error("Error getting emergency appointments:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving emergency appointments",
      error: error.message,
    });
  }
};

export const getPatientEmergencyAppointments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    // Find patient by userId
    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    // Find all emergency appointments for this patient
    const appointments = await EmergencyAppointment.find({
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
    const appointmentsWithUrls = await convertMediaKeysToUrls(appointments);

    res.status(200).json({
      success: true,
      data: appointmentsWithUrls,
      count: appointmentsWithUrls.length,
      message: "Patient emergency appointments retrieved successfully",
    });
  } catch (error: any) {
    console.error("Error getting patient emergency appointments:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving patient emergency appointments",
      error: error.message,
    });
  }
};

/* doctor accepts emergency appointment + emergency online room is created */

export const acceptEmergencyAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const doctorUserId = req.user.id;

    // Find doctor by userId
    const doctor = await Doctor.findOne({ userId: doctorUserId }).populate('userId');
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Find the emergency appointment by ID
    const emergencyAppointment = await EmergencyAppointment.findById(id);
    if (!emergencyAppointment) {
      res.status(404).json({
        success: false,
        message: "Emergency appointment not found",
      });
      return;
    }
    // Check if appointment is already accepted
    if (emergencyAppointment.status !== "pending") {
      res.status(400).json({
        success: false,
        message: "Emergency appointment is already accepted or completed",
      });
      return;
    }

    // Find patient
    const patient = await Patient.findById(emergencyAppointment.patientId).populate('userId');
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    // Create Twilio room for emergency consultation
    const roomName = `emergency_${id}`;
    const room = await client.video.v1.rooms.create({
      uniqueName: roomName,
      type: "group",
      maxParticipants: 2,
    });

    // Update the emergency appointment with doctor info
    emergencyAppointment.doctorId = doctor._id;
    emergencyAppointment.status = "in-progress";
    emergencyAppointment.roomName = room.uniqueName;
    await emergencyAppointment.save();

    // Send email notifications
    try {
      const doctorName = (doctor.userId as any).firstName + ' ' + ((doctor.userId as any).lastName || '');
      const patientName = (patient.userId as any).firstName + ' ' + ((patient.userId as any).lastName || '');

      await sendAppointmentStatusNotification({
        appointmentId: emergencyAppointment._id.toString(),
        status: emergencyAppointment.status,
        patientName: patientName,
        patientEmail: (patient.userId as any).email,
        doctorName: doctorName,
        doctorEmail: (doctor.userId as any).email,
        type: 'Emergency',
      });
      console.log("✅ Emergency appointment acceptance notification sent successfully.");
    } catch (mailError) {
      console.error("🚨 Failed to send emergency appointment acceptance notification:", mailError);
    }

    // Populate the response with both patient and doctor information
    const updatedAppointment = await EmergencyAppointment.findById(id)
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
      data: {
        appointment: updatedAppointment,
        roomName: room.uniqueName,
      },
      message: "Emergency appointment accepted successfully",
    });
  } catch (error: any) {
    console.error("Error accepting emergency appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error accepting emergency appointment",
      error: error.message,
    });
  }
};

/* create room access token */
const AccessToken = jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
export const createEmergencyRoomAccessToken = async (
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

    // finding appointment using roomName
    const appointment = await EmergencyAppointment.findOne({ roomName });
    if (!appointment || appointment.status !== "in-progress") {
      res.status(404).json({
        success: false,
        message: "Emergency appointment not found",
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
        message: "Doctor not found in DB",
      });
      return;
    }
    const doctorUserId = doctor?.userId;
    // patient's user id
    const patient = await Patient.findById(patientId);
    if (!patient) {
      res.status(400).json({
        success: false,
        message: "Patient not found in DB",
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
      appointmentType: "emergency",
    });
  } catch (err) {
    console.error("Failed to generate  twilio access token:", err);
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

    // find the appointment with this room name
    const appointment = await EmergencyAppointment.findOne({ roomName });
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
      const patient = await Patient.findById(appointment.patientId);
      const patientUserDetail = await User.findOne({
        "roleRefs.patient": appointment.patientId,
      });
      if (!patientUserDetail || !patient) {
        res.status(400).json({
          sucess: false,
          message: "Patient or patient user not found.",
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
      // Emergency appointments use normal platformFee and opsExpense fields
      let platformFee = subscription.platformFeeEmergency?.figure || 0;
      let opsExpense = subscription.opsExpenseEmergency?.figure || 0;
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

// Update expired clinic appointments - for cron job
export const updateEmergencyAppointmentExpiredStatus =
  async (): Promise<void> => {
    try {
      const now = new Date();

      // Find appointments that should be expired (end time has passed and status is still pending/confirmed)
      const expiredAppointments = await EmergencyAppointment.updateMany(
        {
          createdAt: { $lt: now },
          status: { $in: ["pending", "confirmed"] },
        },
        {
          $set: { status: "expired" },
        }
      );

      console.log(
        `Updated ${expiredAppointments.modifiedCount} expired clinic appointments`
      );
    } catch (error) {
      console.error("Error updating expired clinic appointments:", error);
    }
  };
