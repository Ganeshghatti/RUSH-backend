import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import User from "../../models/user/user-model";
import ClinicAppointment from "../../models/appointment/clinic-appointment-model";
import {
  clinicUpdateRequestSchema,
  clinicPatchRequestSchema,
} from "../../validation/validation";
import mongoose from "mongoose";
import {
  generateOTP,
  isOTPExpired,
  getOTPExpirationTime,
  isMaxAttemptsReached,
} from "../../utils/otp-utils";

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

// single function to add, update and delete a clinic
// export const updateAllClinics = async(
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {

//     // validate incoming array of clinic
//     const validation = clinicUpdateRequestSchema.safeParse(req.body);
//     if (!validation.success) {
//       res.status(400).json({
//         success: false,
//         message: "Validation error: Invalid data format.",
//         errors: validation.error.errors,
//       });
//       return;
//     }

//     // Authenticate the user
//     const doctorId = req.user?.id;
//     if (!doctorId) {
//       res.status(401).json({
//         success: false,
//         message: "User not authenticated",
//       });
//       return;
//     }

//     // Extract the data from the validated body.
//     console.log("Validation ",validation)
//     const { clinics: newClinics, isActive: newIsActiveStatus } = validation.data;
//     const updatedDoctor = await Doctor.findOneAndUpdate(
//       { userId: doctorId },
//       {
//         // Use $set to replace the entire clinics array and update isActive status
//         $set: {
//           "clinicVisit.clinics": newClinics,
//           "clinicVisit.isActive": newIsActiveStatus,
//         },
//       },
//       {
//         new: true,
//         select: "clinicVisit",
//       }
//     );

//     console.log("Updated Doctor ",updatedDoctor)

//     if (!updatedDoctor) {
//       res.status(404).json({ success: false, message: "Doctor profile not found" });
//       return;
//     }

//     // a successful response.
//     res.status(200).json({
//       success: true,
//       message: "Clinics updated successfully",
//       data: updatedDoctor.clinicVisit,
//     });
//   } catch (err) {
//     console.error("Error updating clinics:", err);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// };
export const updateClinicDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const validation = clinicPatchRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation error: Invalid data format.",
        errors: validation.error.errors,
      });
      return;
    }

    const doctorId = req.user?.id;
    if (!doctorId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const validatedData = validation.data;
    console.log("Validated data ",validatedData)

    if (Object.keys(validatedData).length === 0) {
      res.status(400).json({
        success: false,
        message: "No update data provided.",
      });
      return;
    }

    const updateQuery: { [key: string]: any } = {};

    if (validatedData.clinics !== undefined) {
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
        message: "Doctor profile not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Clinic details updated successfully",
      data: updatedDoctor.clinicVisit,
    });
  } catch (err) {
    console.error("Error patching clinic details:", err);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
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
        message: "Invalid doctor ID",
      });
      return;
    }

    const doctor = await Doctor.findById(doctorId)
      .populate("userId", "firstName lastName profilePic")
      .select("clinicVisit specialization");

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    const clinicVisit = doctor.clinicVisit as any;
    if (!clinicVisit?.isActive) {
      res.status(404).json({
        success: false,
        message: "Doctor does not offer clinic visits",
      });
      return;
    }

    // Filter only active clinics
    const activeClinics = (clinicVisit?.clinics || []).filter(
      (clinic: any) => clinic.isActive
    );

    res.status(200).json({
      success: true,
      message: "Doctor clinic availability retrieved successfully",
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
      message: "Internal server error",
    });
  }
};

// Book clinic appointment
// export const bookClinicAppointment = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const validation = clinicAppointmentBookSchema.safeParse(req.body);
//     if (!validation.success) {
//       res.status(400).json({
//         success: false,
//         message: "Validation error",
//         errors: validation.error.errors,
//       });
//       return;
//     }

//     const patientId = req.user?.id;
//     if (!patientId) {
//       res.status(401).json({
//         success: false,
//         message: "User not authenticated",
//       });
//       return;
//     }

//     const { doctorId, clinicId, slot } = validation.data;

//     // Validate doctor and clinic
//     const doctor = await Doctor.findById(doctorId);
//     if (!doctor) {
//       res.status(404).json({
//         success: false,
//         message: "Doctor not found",
//       });
//       return;
//     }

//     const clinicVisit = doctor.clinicVisit as any;
//     const clinic = (clinicVisit?.clinics || []).find(
//       (c: any) => c._id.toString() === clinicId && c.isActive
//     );

//     if (!clinic) {
//       res.status(404).json({
//         success: false,
//         message: "Clinic not found or inactive",
//       });
//       return;
//     }

//     // Get patient details for wallet check
//     const patient = await User.findById(patientId);
//     if (!patient) {
//       res.status(404).json({
//         success: false,
//         message: "Patient not found",
//       });
//       return;
//     }

//     // Check wallet balance (including frozen amount to ensure total available funds)
//     const availableBalance = (patient as any).getAvailableBalance();
//     if (availableBalance < clinic.consultationFee) {
//       res.status(400).json({
//         success: false,
//         message: "Insufficient wallet balance",
//         data: {
//           required: clinic.consultationFee,
//           available: availableBalance,
//           totalWallet: patient.wallet,
//           frozenAmount: patient.frozenAmount || 0,
//         },
//       });
//       return;
//     }

//     // Parse slot dates
//     const appointmentDay = new Date(slot.day);
//     const startTime = new Date(slot.time.start);
//     const endTime = new Date(slot.time.end);

//     // Check for conflicting appointments
//     const conflictingAppointment = await ClinicAppointment.findOne({
//       doctorId: doctor._id,
//       clinicId: clinicId,
//       "slot.day": appointmentDay,
//       "slot.time.start": { $lt: endTime },
//       "slot.time.end": { $gt: startTime },
//       status: { $in: ["pending", "confirmed"] },
//     });

//     if (conflictingAppointment) {
//       res.status(400).json({
//         success: false,
//         message: "Time slot is already booked",
//       });
//       return;
//     }

//     // Don't deduct from wallet yet - will be frozen when doctor confirms
//     // Amount will be deducted only when appointment is confirmed by doctor

//     // Create appointment
//     const appointment = new ClinicAppointment({
//       doctorId: doctor._id,
//       patientId: patientId,
//       clinicId: clinicId,
//       slot: {
//         day: appointmentDay,
//         duration: slot.duration,
//         time: {
//           start: startTime,
//           end: endTime,
//         },
//       },
//       status: "pending", // Changed from "confirmed" to "pending"
//       paymentDetails: {
//         amount: clinic.consultationFee,
//         walletDeducted: 0, // Will be updated when doctor confirms
//         paymentStatus: "pending", // Will be updated when doctor confirms
//       },
//     });

//     await appointment.save();

//     res.status(201).json({
//       success: true,
//       message:
//         "Clinic appointment booked successfully. Payment will be processed when doctor confirms the appointment.",
//       data: {
//         appointment: appointment,
//         walletBalance: patient.wallet,
//         availableBalance: (patient as any).getAvailableBalance(),
//         note: "Amount will be deducted from wallet when doctor confirms the appointment",
//       },
//     });
//   } catch (error) {
//     console.error("Error booking clinic appointment:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

// Confirm clinic appointment (Doctor only)
// export const confirmClinicAppointment = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { appointmentId } = req.params;
//     const doctorUserId = req.user?.id;

//     if (!doctorUserId) {
//       res.status(401).json({
//         success: false,
//         message: "User not authenticated",
//       });
//       return;
//     }

//     // Find doctor by userId
//     const doctor = await Doctor.findOne({ userId: doctorUserId });
//     if (!doctor) {
//       res.status(404).json({
//         success: false,
//         message: "Doctor profile not found",
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
//         message: "Appointment not found",
//       });
//       return;
//     }

//     if (appointment.status !== "pending") {
//       res.status(400).json({
//         success: false,
//         message: "Only pending appointments can be confirmed",
//       });
//       return;
//     }

//     // Update appointment status to confirmed and generate OTP
//     appointment.status = "confirmed";
//     appointment.otp = {
//       code: generateOTP(),
//       generatedAt: new Date(),
//       expiresAt: getOTPExpirationTime(),
//       attempts: 0,
//       maxAttempts: 3,
//       isUsed: false,
//     };

//     // Freeze the payment amount from patient's wallet
//     const doctorWithClinic = await Doctor.findById(appointment.doctorId);
//     if (doctorWithClinic) {
//       const clinicVisit = doctorWithClinic.clinicVisit as any;
//       const clinic = (clinicVisit?.clinics || []).find(
//         (c: any) => c._id.toString() === appointment.clinicId
//       );

//       if (clinic) {
//         // Get patient and freeze the amount
//         const patient = await User.findById(appointment.patientId);
//         if (patient) {
//           const availableBalance = (patient as any).getAvailableBalance();

//           if (availableBalance >= clinic.consultationFee) {
//             // Freeze the amount using helper method
//             const freezeSuccess = (patient as any).freezeAmount(
//               clinic.consultationFee
//             );
//             if (freezeSuccess) {
//               await patient.save();

//               // Update payment details
//               appointment.paymentDetails = {
//                 amount: clinic.consultationFee,
//                 walletDeducted: clinic.consultationFee,
//                 paymentStatus: "frozen", // Amount is frozen, not yet deducted
//               };
//             } else {
//               res.status(500).json({
//                 success: false,
//                 message: "Failed to freeze payment amount",
//               });
//               return;
//             }
//           } else {
//             res.status(400).json({
//               success: false,
//               message: "Patient has insufficient wallet balance",
//               data: {
//                 required: clinic.consultationFee,
//                 available: availableBalance,
//               },
//             });
//             return;
//           }
//         }
//       }
//     }

//     await appointment.save();

//     res.status(200).json({
//       success: true,
//       message:
//         "Appointment confirmed successfully. Payment amount has been frozen from patient's wallet.",
//       data: {
//         appointmentId: appointment._id,
//         status: appointment.status,
//         otpGenerated: true,
//         paymentStatus: appointment.paymentDetails?.paymentStatus,
//         amountFrozen: appointment.paymentDetails?.walletDeducted,
//       },
//     });
//   } catch (error) {
//     console.error("Error confirming clinic appointment:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

// Cancel/Reject clinic appointment (Doctor only)
export const cancelClinicAppointment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { appointmentId } = req.params;
    const doctorUserId = req.user?.id;

    if (!doctorUserId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    // Find doctor by userId
    const doctor = await Doctor.findOne({ userId: doctorUserId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
      return;
    }

    // Find appointment
    const appointment = await ClinicAppointment.findOne({
      _id: appointmentId,
      doctorId: doctor._id,
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
      return;
    }

    if (
      appointment.status === "completed" ||
      appointment.status === "cancelled"
    ) {
      res.status(400).json({
        success: false,
        message: "Cannot cancel completed or already cancelled appointments",
      });
      return;
    }

    // Handle refunds based on payment status
    let refundAmount = 0;
    if (
      appointment.paymentDetails?.walletDeducted &&
      appointment.paymentDetails.walletDeducted > 0
    ) {
      const patient = await User.findById(appointment.patientId);
      if (patient) {
        refundAmount = appointment.paymentDetails.walletDeducted;

        if (appointment.paymentDetails.paymentStatus === "frozen") {
          // If amount was frozen, unfreeze it using helper method
          (patient as any).unfreezeAmount(refundAmount);
        } else if (appointment.paymentDetails.paymentStatus === "completed") {
          // If amount was already deducted, refund to wallet
          patient.wallet += refundAmount;
        }

        await patient.save();
      }
    }

    // Update appointment status to cancelled
    appointment.status = "cancelled";
    // Note: Cancellation reason removed since history field is removed

    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      data: {
        appointmentId: appointment._id,
        status: appointment.status,
        refunded: refundAmount,
        refundType:
          appointment.paymentDetails?.paymentStatus === "frozen"
            ? "unfrozen"
            : "refunded",
      },
    });
  } catch (error) {
    console.error("Error cancelling clinic appointment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

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
        message: "User not authenticated",
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
      message: "Patient clinic appointments retrieved successfully",
      data: {
        appointments: appointmentsWithClinicDetails,
      },
    });
  } catch (error) {
    console.error("Error retrieving patient clinic appointments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
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
        message: "User not authenticated",
      });
      return;
    }

    // Find doctor by userId
    const doctor = await Doctor.findOne({ userId: doctorUserId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor profile not found",
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
      message: "Doctor clinic appointments retrieved successfully",
      data: {
        appointments: appointmentsWithClinicDetails,
      },
    });
  } catch (error) {
    console.error("Error retrieving doctor clinic appointments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
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
        message: "User not authenticated",
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
        message: "Appointment not found",
      });
      return;
    }

    if (appointment.status !== "confirmed") {
      res.status(400).json({
        success: false,
        message: "OTP can only be retrieved for confirmed appointments",
      });
      return;
    }

    const otpData = appointment.otp as any;

    // Check if OTP exists (should exist as it's generated during confirmation)
    if (!otpData?.code) {
      res.status(400).json({
        success: false,
        message: "No OTP found for this appointment. Please contact support.",
      });
      return;
    }

    // Check if OTP has expired
    if (otpData?.expiresAt && isOTPExpired(otpData.expiresAt)) {
      res.status(400).json({
        success: false,
        message:
          "OTP has expired. Please contact your doctor for a new appointment.",
      });
      return;
    }

    // Check if OTP is already used
    if (otpData?.isUsed) {
      res.status(400).json({
        success: false,
        message: "OTP has already been used",
      });
      return;
    }

    const updatedOtpData = appointment.otp as any;

    res.status(200).json({
      success: true,
      message: "OTP retrieved successfully",
      data: {
        otp: updatedOtpData?.code,
        expiresAt: updatedOtpData?.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error generating appointment OTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Validate OTP and complete appointment
// export const validateVisitOTP = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const validation = otpValidationSchema.safeParse(req.body);
//     if (!validation.success) {
//       res.status(400).json({
//         success: false,
//         message: "Validation error",
//         errors: validation.error.errors,
//       });
//       return;
//     }

//     const doctorUserId = req.user?.id;
//     if (!doctorUserId) {
//       res.status(401).json({
//         success: false,
//         message: "User not authenticated",
//       });
//       return;
//     }

//     const { appointmentId, otp } = validation.data;

//     // Find doctor
//     const doctor = await Doctor.findOne({ userId: doctorUserId });
//     if (!doctor) {
//       res.status(404).json({
//         success: false,
//         message: "Doctor profile not found",
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
//         message: "Appointment not found",
//       });
//       return;
//     }

//     if (appointment.status !== "confirmed") {
//       res.status(400).json({
//         success: false,
//         message: "Appointment is not in confirmed status",
//       });
//       return;
//     }

//     const otpData = appointment.otp as any;

//     // Check if OTP exists
//     if (!otpData?.code) {
//       res.status(400).json({
//         success: false,
//         message: "No OTP generated for this appointment",
//       });
//       return;
//     }

//     // Check if OTP is already used
//     if (otpData?.isUsed) {
//       res.status(400).json({
//         success: false,
//         message: "OTP has already been used",
//       });
//       return;
//     }

//     // Check if max attempts reached
//     if (
//       isMaxAttemptsReached(otpData?.attempts || 0, otpData?.maxAttempts || 3)
//     ) {
//       res.status(400).json({
//         success: false,
//         message: "Maximum OTP verification attempts exceeded",
//       });
//       return;
//     }

//     // Check if OTP is expired
//     if (otpData?.expiresAt && isOTPExpired(otpData.expiresAt)) {
//       res.status(400).json({
//         success: false,
//         message: "OTP has expired",
//       });
//       return;
//     }

//     // Increment attempts
//     (appointment.otp as any).attempts = (otpData?.attempts || 0) + 1;

//     // Validate OTP
//     if (otpData?.code !== otp.toUpperCase()) {
//       await appointment.save();

//       const remainingAttempts =
//         (otpData?.maxAttempts || 3) - (appointment.otp as any).attempts;
//       res.status(400).json({
//         success: false,
//         message: "Invalid OTP",
//         data: {
//           remainingAttempts: remainingAttempts,
//         },
//       });
//       return;
//     }

//     // OTP is valid - complete the appointment
//     appointment.status = "completed";
//     (appointment.otp as any).isUsed = true;

//     // Process final payment: convert frozen amount to actual deduction
//     if (
//       appointment.paymentDetails?.paymentStatus === "frozen" &&
//       appointment.paymentDetails?.walletDeducted > 0
//     ) {
//       const patient = await User.findById(appointment.patientId);
//       if (patient) {
//         const deductAmount = appointment.paymentDetails.walletDeducted;

//         // Deduct from frozen amount using helper method
//         const deductSuccess = (patient as any).deductFrozenAmount(deductAmount);
//         if (deductSuccess) {
//           await patient.save();

//           // Update payment status to completed
//           appointment.paymentDetails.paymentStatus = "completed";
//         } else {
//           res.status(500).json({
//             success: false,
//             message: "Failed to process final payment",
//           });
//           return;
//         }
//       }
//     }

//     await appointment.save();

//     res.status(200).json({
//       success: true,
//       message: "Visit validated successfully. Appointment completed.",
//       data: {
//         appointment: appointment,
//       },
//     });
//   } catch (error) {
//     console.error("Error validating visit OTP:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

// Update expired clinic appointments - for cron job
export const updateClinicAppointmentExpiredStatus = async (): Promise<void> => {
  try {
    const now = new Date();

    // Find appointments that should be expired (end time has passed and status is still pending/confirmed)
    const expiredAppointments = await ClinicAppointment.updateMany(
      {
        "slot.time.end": { $lt: now },
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
