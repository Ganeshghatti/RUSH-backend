import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import User from "../../models/user/user-model";
import Patient from "../../models/user/patient-model";
import ClinicAppointment from "../../models/appointment/clinic-appointment-model";
import {
  clinicPatchRequestSchema,
  clinicAppointmentBookSchema,
  otpValidationSchema,
} from "../../validation/validation";
import mongoose from "mongoose";
import {
  generateOTP,
  isOTPExpired,
  getOTPExpirationTime,
  isMaxAttemptsReached,
} from "../../utils/otp-utils";
import DoctorSubscription from "../../models/doctor-subscription";

// Interface for authenticated request
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Helper function to populate clinic details from doctor's embedded clinics
const populateClinicDetails = (appointments: any[], doctor: any) => {
  return appointments.map((appointment) => {
    const clinicVisit = doctor.clinicVisit as any;
    const clinic = (clinicVisit?.clinics || []).find(
      (c: any) => c._id.toString() === appointment.clinicId
    );

    return {
      ...appointment.toObject(),
      clinicDetails: clinic
        ? {
            clinicName: clinic.clinicName,
            address: clinic.address,
            consultationFee: clinic.consultationFee,
            frontDeskNumber: clinic.frontDeskNumber,
            operationalDays: clinic.operationalDays,
            timeSlots: clinic.timeSlots,
            isActive: clinic.isActive,
          }
        : null,
    };
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

// single function to add, update and delete a clinic by doctor
export const updateClinicDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const validation = clinicPatchRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Please review the clinic details and try again.",
        action: "updateClinicDetails:validation-error",
        data: {
          errors: validation.error.errors,
        },
      });
      return;
    }

    const doctorId = req.user?.id;
    if (!doctorId) {
      res.status(401).json({
        success: false,
        message: "You must be signed in to update clinic details.",
        action: "updateClinicDetails:not-authenticated",
      });
      return;
    }

    const validatedData = validation.data;

    if (Object.keys(validatedData).length === 0) {
      res.status(400).json({
        success: false,
        message: "Please provide fields to update.",
        action: "updateClinicDetails:no-fields",
      });
      return;
    }

    const updateQuery: { [key: string]: any } = {};

    if (validatedData.clinics !== undefined) {
      // Fetch doctor to get active subscription
      const doctor = await Doctor.findOne({ userId: doctorId }).select(
        "subscriptions"
      );
      if (!doctor) {
        res.status(404).json({
          success: false,
          message: "We couldn't find your doctor profile.",
          action: "updateClinicDetails:doctor-not-found",
        });
        return;
      }
      // Find the latest/active subscription (assuming last is active)
      const activeSub =
        doctor.subscriptions && doctor.subscriptions.length > 0
          ? doctor.subscriptions[doctor.subscriptions.length - 1]
          : null;
      if (!activeSub || !activeSub.SubscriptionId) {
        res.status(400).json({
          success: false,
          message: "No active subscription found. Please subscribe to a plan.",
          action: "updateClinicDetails:no-active-subscription",
        });
        return;
      }
      // Fetch DoctorSubscription to get no_of_clinics
      const subDoc = await DoctorSubscription.findById(
        activeSub.SubscriptionId
      );
      if (!subDoc) {
        res.status(400).json({
          success: false,
          message: "We couldn't find the associated subscription plan.",
          action: "updateClinicDetails:subscription-not-found",
        });
        return;
      }
      const maxClinics = subDoc.no_of_clinics || 0;
      if (
        Array.isArray(validatedData.clinics) &&
        validatedData.clinics.length > maxClinics
      ) {
        res.status(400).json({
          success: false,
          message: `Your subscription allows only ${maxClinics} clinics. Upgrade your plan to add more clinics.`,
          action: "updateClinicDetails:clinic-limit",
        });
        return;
      }
      updateQuery["clinicVisit.clinics"] = validatedData.clinics;
    }
    if (validatedData.isActive !== undefined) {
      updateQuery["clinicVisit.isActive"] = validatedData.isActive;
    }

    const updatedDoctor = await Doctor.findOneAndUpdate(
      { userId: doctorId },
      { $set: updateQuery },
      { new: true, select: "clinicVisit" }
    );

    if (!updatedDoctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your doctor profile.",
        action: "updateClinicDetails:doctor-not-found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Clinic details updated successfully.",
      action: "updateClinicDetails:success",
      data: updatedDoctor.clinicVisit,
    });
  } catch (err) {
    console.error("Error patching clinic details:", err);
    res.status(500).json({
      success: false,
      message: "We couldn't update the clinic details.",
      action: err instanceof Error ? err.message : String(err),
    });
  }
};

// Get doctor's clinic availability for patients
export const getDoctorClinicAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { doctorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      res.status(400).json({
        success: false,
        message: "The doctor ID provided is invalid.",
        action: "getDoctorClinicAvailability:invalid-id",
      });
      return;
    }

    const doctor = await Doctor.findById(doctorId)
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

    const clinicVisit = doctor.clinicVisit as any;
    if (!clinicVisit?.isActive) {
      res.status(404).json({
        success: false,
        message: "This doctor does not offer clinic visits.",
        action: "getDoctorClinicAvailability:no-active-clinic",
      });
      return;
    }

    // Filter only active clinics
    const activeClinics = (clinicVisit?.clinics || []).filter(
      (clinic: any) => clinic.isActive
    );

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
  } catch (error) {
    console.error("Error retrieving doctor clinic availability:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load the clinic availability.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

// Step1 - Book clinic appointment by patient + freeze amount
export const bookClinicAppointment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const validation = clinicAppointmentBookSchema.safeParse(req.body);
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
    const patientUserId = req.user?.id;
    if (!patientUserId) {
      res.status(401).json({
        success: false,
        message: "You must be signed in to book a clinic appointment.",
        action: "bookClinicAppointment:not-authenticated",
      });
      return;
    }

    //***** Validate doctor *****\\
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find the selected doctor.",
        action: "bookClinicAppointment:doctor-not-found",
      });
      return;
    }

    // Validate patient
    const patient = await Patient.findOne({ userId: patientUserId });
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
    const clinicVisit = doctor.clinicVisit as any;
    const clinic = (clinicVisit?.clinics || []).find(
      (c: any) => c._id.toString() === clinicId && c.isActive
    );
    if (!clinic) {
      res.status(404).json({
        success: false,
        message: "We couldn't find an active clinic for that doctor.",
        action: "bookClinicAppointment:clinic-not-found",
      });
      return;
    }

    //***** Get Patient User details for wallet check *****\\
    const patientUserDetail = await User.findById(patientUserId);
    if (!patientUserDetail) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your patient's User profile.",
        action: "bookClinicAppointment:patientUser-not-found",
      });
      return;
    }

    //***** Check wallet balance - getAvailableBalance excludes frozen amount from wallet *****\\
    const availableBalance = (patientUserDetail as any).getAvailableBalance();
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
    const conflictingAppointment = await ClinicAppointment.findOne({
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
    await patientUserDetail.save();

    // Create appointment
    const appointment = new ClinicAppointment({
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

    await appointment.save();

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
  } catch (error) {
    console.error("Error booking clinic appointment:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't book the clinic appointment.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

// Step2 - Accept clinic appointment by Doctor + generate otp
export const acceptClinicAppointment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { appointmentId } = req.params;

    const doctorUserId = req.user?.id;
    if (!doctorUserId) {
      res.status(401).json({
        success: false,
        message: "You must be signed in to accept appointments.",
        action: "acceptClinicAppointment:not-authenticated",
      });
      return;
    }

    //***** Find doctor by their userId *****\\
    const doctor = await Doctor.findOne({ userId: doctorUserId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your doctor profile.",
        action: "acceptClinicAppointment:doctor-not-found",
      });
      return;
    }

    //***** Find appointment *****\\
    const appointment = await ClinicAppointment.findOne({
      _id: appointmentId,
      doctorId: doctor._id,
    });
    if (!appointment) {
      res.status(404).json({
        success: false,
        message: "We couldn't find that appointment.",
        action: "acceptClinicAppointment:appointment-not-found",
      });
      return;
    }
    if (appointment.status !== "pending") {
      res.status(400).json({
        success: false,
        message: "Only pending appointments can be accepted.",
        action: "acceptClinicAppointment:invalid-status",
      });
      return;
    }

    // Update appointment status to accepted and generate OTP
    appointment.status = "accepted";
    appointment.otp = {
      code: generateOTP(),
      generatedAt: new Date(),
      expiresAt: getOTPExpirationTime(),
      attempts: 0,
      maxAttempts: 3,
      isUsed: false,
    };
    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Appointment accepted successfully.",
      action: "acceptClinicAppointment:success",
      data: {
        appointmentId: appointment._id,
        status: appointment.status,
        otpGenerated: true,
        paymentStatus: appointment.paymentDetails?.paymentStatus,
        patientWalletDeducted:
          appointment.paymentDetails?.patientWalletDeducted,
        patientAmountFrozen: appointment.paymentDetails?.patientWalletFrozen,
      },
    });
  } catch (error) {
    console.error("Error accepting clinic appointment:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't accept the clinic appointment.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

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

// Get patient's clinic appointments
export const getPatientClinicAppointments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const patientId = req.user?.id;
    if (!patientId) {
      res.status(401).json({
        success: false,
        message: "You must be signed in to view clinic appointments.",
        action: "getPatientClinicAppointments:not-authenticated",
      });
      return;
    }

    const appointments = await ClinicAppointment.find({ patientId })
      .populate("doctorId", "userId specialization clinicVisit")
      .populate({
        path: "doctorId",
        populate: {
          path: "userId",
          select: "firstName lastName profilePic",
        },
      })
      .sort({ "slot.day": -1 });

    // Populate clinic details from embedded clinics
    const appointmentsWithClinicDetails = appointments.map((appointment) => {
      const doctor = appointment.doctorId as any;
      const clinicVisit = doctor?.clinicVisit as any;
      const clinic = (clinicVisit?.clinics || []).find(
        (c: any) => c._id.toString() === appointment.clinicId
      );

      return {
        ...appointment.toObject(),
        clinicDetails: clinic
          ? {
              clinicName: clinic.clinicName,
              address: clinic.address,
              consultationFee: clinic.consultationFee,
              frontDeskNumber: clinic.frontDeskNumber,
              operationalDays: clinic.operationalDays,
              timeSlots: clinic.timeSlots,
              isActive: clinic.isActive,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      message: "Patient clinic appointments retrieved successfully.",
      action: "getPatientClinicAppointments:success",
      data: {
        appointments: appointmentsWithClinicDetails,
      },
    });
  } catch (error) {
    console.error("Error retrieving patient clinic appointments:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load the patient's clinic appointments.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

// Get doctor's clinic appointments
export const getDoctorClinicAppointments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const doctorUserId = req.user?.id;
    if (!doctorUserId) {
      res.status(401).json({
        success: false,
        message: "You must be signed in to view clinic appointments.",
        action: "getDoctorClinicAppointments:not-authenticated",
      });
      return;
    }

    // Find doctor by userId
    const doctor = await Doctor.findOne({ userId: doctorUserId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your doctor profile.",
        action: "getDoctorClinicAppointments:doctor-not-found",
      });
      return;
    }

    const appointments = await ClinicAppointment.find({ doctorId: doctor._id })
      .populate("patientId", "firstName lastName profilePic phone")
      .sort({ "slot.day": -1 });

    // Populate clinic details from embedded clinics
    const appointmentsWithClinicDetails = appointments.map((appointment) => {
      const clinicVisit = doctor.clinicVisit as any;
      const clinic = (clinicVisit?.clinics || []).find(
        (c: any) => c._id.toString() === appointment.clinicId
      );

      return {
        ...appointment.toObject(),
        clinicDetails: clinic
          ? {
              clinicName: clinic.clinicName,
              address: clinic.address,
              consultationFee: clinic.consultationFee,
              frontDeskNumber: clinic.frontDeskNumber,
              operationalDays: clinic.operationalDays,
              timeSlots: clinic.timeSlots,
              isActive: clinic.isActive,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      message: "Doctor clinic appointments retrieved successfully.",
      action: "getDoctorClinicAppointments:success",
      data: {
        appointments: appointmentsWithClinicDetails,
      },
    });
  } catch (error) {
    console.error("Error retrieving doctor clinic appointments:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load the doctor clinic appointments.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

// Generate or retrieve OTP for appointment
export const getAppointmentOTP = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { appointmentId } = req.params;
    const patientId = req.user?.id;

    if (!patientId) {
      res.status(401).json({
        success: false,
        message: "You must be signed in to view the OTP.",
        action: "getAppointmentOTP:not-authenticated",
      });
      return;
    }

    const appointment = await ClinicAppointment.findOne({
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

    const otpData = appointment.otp as any;

    // Check if OTP exists (should exist as it's generated during confirmation)
    if (!otpData?.code) {
      res.status(400).json({
        success: false,
        message: "No OTP was generated for this appointment.",
        action: "getAppointmentOTP:otp-missing",
      });
      return;
    }

    // Check if OTP has expired
    if (otpData?.expiresAt && isOTPExpired(otpData.expiresAt)) {
      res.status(400).json({
        success: false,
        message: "This OTP has expired. Please contact your doctor.",
        action: "getAppointmentOTP:otp-expired",
      });
      return;
    }

    // Check if OTP is already used
    if (otpData?.isUsed) {
      res.status(400).json({
        success: false,
        message: "This OTP has already been used.",
        action: "getAppointmentOTP:otp-used",
      });
      return;
    }

    const updatedOtpData = appointment.otp as any;

    res.status(200).json({
      success: true,
      message: "OTP retrieved successfully.",
      action: "getAppointmentOTP:success",
      data: {
        otp: updatedOtpData?.code,
        expiresAt: updatedOtpData?.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error generating appointment OTP:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't retrieve the appointment OTP.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

// Step3 - Validate OTP and complete appointment
export const validateVisitOTP = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const validation = otpValidationSchema.safeParse(req.body);
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

    const doctorUserId = req.user?.id;
    if (!doctorUserId) {
      res.status(401).json({
        success: false,
        message: "You must be signed in to validate the visit.",
        action: "validateVisitOTP:not-authenticated",
      });
      return;
    }
    // Find doctor
    const doctor = await Doctor.findOne({ userId: doctorUserId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your doctor profile.",
        action: "validateVisitOTP:doctor-not-found",
      });
      return;
    }
    // Find doctor user detail to increment amount in the doctor user wallet
    const doctorUserDetail = await User.findById(doctorUserId);
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
    const activeSub = doctor.subscriptions.find(
      (sub) => !sub.endDate || sub.endDate > now
    );
    if (!activeSub) {
      res.status(400).json({
        success: false,
        message: "The doctor does not have an active subscription.",
        action: "validateVisitOTP:no-active-subscription",
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
        action: "validateVisitOTP:subscription-not-found",
      });
      return;
    }
    let platformFee = subscription?.platformFeeClinic?.figure || 0;
    let opsExpense = subscription?.opsExpenseClinic?.figure || 0;

    // Find appointment
    const appointment = await ClinicAppointment.findOne({
      _id: appointmentId,
      doctorId: doctor._id,
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

    const otpData = appointment.otp as any;

    // Check if OTP exists
    if (!otpData?.code) {
      res.status(400).json({
        success: false,
        message: "No OTP was generated for this appointment.",
        action: "validateVisitOTP:otp-missing",
      });
      return;
    }

    // Check if OTP is already used
    if (otpData?.isUsed) {
      res.status(400).json({
        success: false,
        message: "This OTP has already been used.",
        action: "validateVisitOTP:otp-used",
      });
      return;
    }

    // Check if max attempts reached
    if (
      isMaxAttemptsReached(otpData?.attempts || 0, otpData?.maxAttempts || 3)
    ) {
      res.status(400).json({
        success: false,
        message: "Maximum OTP verification attempts exceeded.",
        action: "validateVisitOTP:max-attempts",
      });
      return;
    }

    // Check if OTP is expired
    if (otpData?.expiresAt && isOTPExpired(otpData.expiresAt)) {
      res.status(400).json({
        success: false,
        message: "This OTP has expired.",
        action: "validateVisitOTP:otp-expired",
      });
      return;
    }

    // Increment attempts
    (appointment.otp as any).attempts = (otpData?.attempts || 0) + 1;

    // Validate OTP
    if (otpData?.code !== otp.toUpperCase()) {
      await appointment.save();

      const remainingAttempts =
        (otpData?.maxAttempts || 3) - (appointment.otp as any).attempts;
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
    (appointment.otp as any).isUsed = true;

    //***** convert frozen amount to actual deduction *****\\
    if (appointment.paymentDetails?.paymentStatus === "pending") {
      const patientUserDetail = await User.findOne({
        "roleRefs.patient": appointment.patientId,
      });
      if (patientUserDetail) {
        const deductAmount = appointment.paymentDetails.amount;

        // Deduct from frozen amount using helper method - (deduct from user.frozenAmount + deduct from user.wallet)
        const deductSuccess = (patientUserDetail as any).deductFrozenAmount(
          deductAmount
        );
        if (deductSuccess) {
          await patientUserDetail.save();
          appointment.paymentDetails.patientWalletDeducted = deductAmount;
          appointment.paymentDetails.patientWalletFrozen -= deductAmount;
          appointment.paymentDetails.paymentStatus = "completed";

          // increment in doctor user
          let incrementAmount =
            deductAmount - platformFee - (deductAmount * opsExpense) / 100;
          if (incrementAmount < 0) incrementAmount = 0;
          doctorUserDetail.wallet += incrementAmount;
          await doctorUserDetail.save();
        } else {
          res.status(500).json({
            success: false,
            message: "We couldn't process the final payment.",
            action: "validateVisitOTP:wallet-deduction-failed",
          });
          return;
        }
      } else {
        res.status(401).json({
          success: false,
          message: "We couldn't find patient's user profile.",
          action: "finalizePayment:patientUser-not-found",
        });
        return;
      }
    }

    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Visit validated successfully. Appointment completed.",
      action: "validateVisitOTP:success",
      data: {
        appointment: appointment,
      },
    });
  } catch (error) {
    console.error("Error validating visit OTP:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't validate the clinic visit.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

//***** script for cron job
export const updateClinicStatusCron = async () => {
  try {
    const now = new Date();

    const appointments = await ClinicAppointment.find({
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
      message: "Clinic Statuses updated.",
      summary: { expired, completed, unattended },
    };
  } catch (error) {
    console.error("Cron job error in updateClinicStatusCron:", error);
    return {
      success: false,
      message: "Cron job failed to update clinic appointments.",
      error: (error as Error).message,
    };
  }
};
