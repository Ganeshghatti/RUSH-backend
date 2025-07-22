import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import User from "../../models/user/user-model";
import ClinicAppointment from "../../models/appointment/clinic-appointment-model";
import { 
  clinicCreateSchema, 
  clinicUpdateSchema, 
  clinicAppointmentBookSchema,
  otpValidationSchema 
} from "../../validation/validation";
import mongoose from "mongoose";
import { 
  generateOTP, 
  isOTPExpired, 
  getOTPExpirationTime,
  isMaxAttemptsReached 
} from "../../utils/otp-utils";

// Interface for authenticated request
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Add clinic to doctor's profile
export const addClinic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = clinicCreateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation error",
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

    // Find doctor by userId
    const doctor = await Doctor.findOne({ userId: doctorId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
      return;
    }

    const clinicData = {
      ...validation.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add clinic using mongoose push method
    (doctor.clinicVisit as any).clinics.push(clinicData);
    (doctor.clinicVisit as any).isActive = true;
    
    await doctor.save();

    res.status(201).json({
      success: true,
      message: "Clinic added successfully",
      data: {
        clinic: clinicData,
      },
    });
  } catch (error) {
    console.error("Error adding clinic:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get all clinics for a doctor
export const getDoctorClinics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doctorId = req.user?.id;
    if (!doctorId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const doctor = await Doctor.findOne({ userId: doctorId }).select("clinicVisit");
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
      return;
    }

    const clinicVisit = doctor.clinicVisit as any;
    res.status(200).json({
      success: true,
      message: "Clinics retrieved successfully",
      data: {
        clinics: clinicVisit?.clinics || [],
        isActive: clinicVisit?.isActive || false,
      },
    });
  } catch (error) {
    console.error("Error retrieving clinics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update clinic details
export const updateClinic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clinicId } = req.params;
    const validation = clinicUpdateSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation error",
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

    const doctor = await Doctor.findOne({ userId: doctorId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
      return;
    }

    const clinicVisit = doctor.clinicVisit as any;
    const clinics = clinicVisit?.clinics || [];
    
    // Find and update the specific clinic
    const clinicIndex = clinics.findIndex((clinic: any) => clinic._id.toString() === clinicId);

    if (clinicIndex === -1) {
      res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
      return;
    }

    // Update clinic data
    Object.assign(clinics[clinicIndex], {
      ...validation.data,
      updatedAt: new Date(),
    });

    await doctor.save();

    res.status(200).json({
      success: true,
      message: "Clinic updated successfully",
      data: {
        clinic: clinics[clinicIndex],
      },
    });
  } catch (error) {
    console.error("Error updating clinic:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete clinic
export const deleteClinic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clinicId } = req.params;
    const doctorId = req.user?.id;

    if (!doctorId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const doctor = await Doctor.findOne({ userId: doctorId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
      return;
    }

    const clinicVisit = doctor.clinicVisit as any;
    const clinics = clinicVisit?.clinics || [];
    const initialLength = clinics.length;
    
    // Remove clinic using pull method
    (doctor.clinicVisit as any).clinics.pull({ _id: clinicId });

    if ((doctor.clinicVisit as any).clinics.length === initialLength) {
      res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
      return;
    }

    // If no clinics left, deactivate clinic visits
    if ((doctor.clinicVisit as any).clinics.length === 0) {
      (doctor.clinicVisit as any).isActive = false;
    }

    await doctor.save();

    res.status(200).json({
      success: true,
      message: "Clinic deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting clinic:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get doctor's clinic availability for patients
export const getDoctorClinicAvailability = async (req: Request, res: Response): Promise<void> => {
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
    const activeClinics = (clinicVisit?.clinics || []).filter((clinic: any) => clinic.isActive);

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
export const bookClinicAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = clinicAppointmentBookSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: validation.error.errors,
      });
      return;
    }

    const patientId = req.user?.id;
    if (!patientId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const { doctorId, clinicId, slot, history } = validation.data;

    // Validate doctor and clinic
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    const clinicVisit = doctor.clinicVisit as any;
    const clinic = (clinicVisit?.clinics || []).find(
      (c: any) => c._id.toString() === clinicId && c.isActive
    );
    
    if (!clinic) {
      res.status(404).json({
        success: false,
        message: "Clinic not found or inactive",
      });
      return;
    }

    // Get patient details for wallet check
    const patient = await User.findById(patientId);
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    // Check wallet balance
    if (patient.wallet < clinic.consultationFee) {
      res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
        data: {
          required: clinic.consultationFee,
          available: patient.wallet,
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
        message: "Time slot is already booked",
      });
      return;
    }

    // Deduct from wallet
    patient.wallet -= clinic.consultationFee;
    await patient.save();

    // Create appointment
    const appointment = new ClinicAppointment({
      doctorId: doctor._id,
      patientId: patientId,
      clinicId: clinicId,
      clinicDetails: {
        clinicName: clinic.clinicName,
        address: clinic.address,
        consultationFee: clinic.consultationFee,
      },
      slot: {
        day: appointmentDay,
        duration: slot.duration,
        time: {
          start: startTime,
          end: endTime,
        },
      },
      history: history || {},
      status: "confirmed",
      paymentDetails: {
        amount: clinic.consultationFee,
        walletDeducted: clinic.consultationFee,
        paymentStatus: "completed",
      },
    });

    await appointment.save();

    res.status(201).json({
      success: true,
      message: "Clinic appointment booked successfully",
      data: {
        appointment: appointment,
        walletBalance: patient.wallet,
      },
    });
  } catch (error) {
    console.error("Error booking clinic appointment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get patient's clinic appointments
export const getPatientClinicAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
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
      .populate("doctorId", "userId specialization")
      .populate({
        path: "doctorId",
        populate: {
          path: "userId",
          select: "firstName lastName profilePic",
        },
      })
      .sort({ "slot.day": -1 });

    res.status(200).json({
      success: true,
      message: "Patient clinic appointments retrieved successfully",
      data: {
        appointments: appointments,
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
export const getDoctorClinicAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
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

    res.status(200).json({
      success: true,
      message: "Doctor clinic appointments retrieved successfully",
      data: {
        appointments: appointments,
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
export const getAppointmentOTP = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: "OTP can only be generated for confirmed appointments",
      });
      return;
    }

    // Check if appointment is for today
    const today = new Date();
    const appointmentDay = new Date(appointment.slot?.day || "");
    const isToday = today.toDateString() === appointmentDay.toDateString();

    if (!isToday) {
      res.status(400).json({
        success: false,
        message: "OTP can only be generated on the appointment day",
      });
      return;
    }

    const otpData = appointment.otp as any;
    
    // Generate new OTP if none exists or if existing OTP is expired
    if (!otpData?.code || (otpData?.expiresAt && isOTPExpired(otpData.expiresAt))) {
      appointment.otp = {
        code: generateOTP(),
        generatedAt: new Date(),
        expiresAt: getOTPExpirationTime(),
        attempts: 0,
        maxAttempts: 3,
        isUsed: false,
      };
      await appointment.save();
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
export const validateVisitOTP = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = otpValidationSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: validation.error.errors,
      });
      return;
    }

    const doctorUserId = req.user?.id;
    if (!doctorUserId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const { appointmentId, otp } = validation.data;

    // Find doctor
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

    if (appointment.status !== "confirmed") {
      res.status(400).json({
        success: false,
        message: "Appointment is not in confirmed status",
      });
      return;
    }

    const otpData = appointment.otp as any;
    
    // Check if OTP exists
    if (!otpData?.code) {
      res.status(400).json({
        success: false,
        message: "No OTP generated for this appointment",
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

    // Check if max attempts reached
    if (isMaxAttemptsReached(otpData?.attempts || 0, otpData?.maxAttempts || 3)) {
      res.status(400).json({
        success: false,
        message: "Maximum OTP verification attempts exceeded",
      });
      return;
    }

    // Check if OTP is expired
    if (otpData?.expiresAt && isOTPExpired(otpData.expiresAt)) {
      res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
      return;
    }

    // Increment attempts
    (appointment.otp as any).attempts = (otpData?.attempts || 0) + 1;

    // Validate OTP
    if (otpData?.code !== otp.toUpperCase()) {
      await appointment.save();
      
      const remainingAttempts = (otpData?.maxAttempts || 3) - ((appointment.otp as any).attempts);
      res.status(400).json({
        success: false,
        message: "Invalid OTP",
        data: {
          remainingAttempts: remainingAttempts,
        },
      });
      return;
    }

    // OTP is valid - complete the appointment
    appointment.status = "completed";
    (appointment.otp as any).isUsed = true;
    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Visit validated successfully. Appointment completed.",
      data: {
        appointment: appointment,
      },
    });
  } catch (error) {
    console.error("Error validating visit OTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

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

    console.log(`Updated ${expiredAppointments.modifiedCount} expired clinic appointments`);
  } catch (error) {
    console.error("Error updating expired clinic appointments:", error);
  }
};
