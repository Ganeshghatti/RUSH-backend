import { Request, Response } from "express";
import HomeVisitAppointment from "../../models/appointment/homevisit-appointment-model";
import Doctor from "../../models/user/doctor-model";
import User from "../../models/user/user-model";
import {
  generateOTP,
  isOTPExpired,
  getOTPExpirationTime,
  isMaxAttemptsReached,
} from "../../utils/otp-utils";
import {
  homeVisitAppointmentBookSchema,
  homeVisitAppointmentAcceptSchema,
  homeVisitAppointmentCompleteSchema,
  homeVisitAppointmentCancelSchema,
  homeVisitConfigUpdateSchema,
} from "../../validation/validation";

// NOTE: Other controllers access req.user directly; we rely on global Express augmentation.
// Removing local AuthRequest avoids duplicated type drift.

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// Common population helper
const populateAppointment = (id: any) =>
  HomeVisitAppointment.findById(id)
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
    });

// Extract client IP (basic; respects x-forwarded-for first entry)
const getClientIp = (req: Request): string | undefined => {
  const fwd = (req.headers["x-forwarded-for"] as string) || "";
  if (fwd) return fwd.split(",")[0].trim();
  return req.ip || (req.socket && req.socket.remoteAddress) || undefined;
};

// Step 1: Patient creates home visit request with fixed cost only
export const bookHomeVisitAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validate request body against schema (mirrors clinic & other controllers pattern)
    const parsed = homeVisitAppointmentBookSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.errors,
      });
      return;
    }

    const { doctorId, slot, patientAddress } = parsed.data;
    const patientId = (req as any).user?.id;

    if (!patientId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    // (Field presence/shape already enforced by Zod schema)

    // Check if doctor exists and has home visit enabled
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    if (!doctor.homeVisit || !doctor.homeVisit.isActive) {
      res.status(400).json({
        success: false,
        message: "Doctor does not offer home visit services",
      });
      return;
    }

    // Check if patient exists
    const patient = await User.findById(patientId);
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    // Get fixed cost from doctor's home visit configuration
    const fixedCost = doctor.homeVisit?.fixedPrice || 0;
    if (fixedCost <= 0) {
      res.status(400).json({
        success: false,
        message: "Doctor has not set home visit pricing",
      });
      return;
    }

    // Calculate distance between doctor and patient
    let doctorDistance = 0;
    if (doctor.homeVisit?.location && doctor.homeVisit.location.coordinates) {
      const [doctorLon, doctorLat] = doctor.homeVisit.location.coordinates;
      const [patientLon, patientLat] = patientAddress.location.coordinates;
      doctorDistance = calculateDistance(
        doctorLat,
        doctorLon,
        patientLat,
        patientLon
      );
    }

    // Check if the slot is already booked
    const existingAppointment = await HomeVisitAppointment.findOne({
      doctorId,
      "slot.day": new Date(slot.day),
      "slot.time.start": new Date(slot.time.start),
      "slot.time.end": new Date(slot.time.end),
      status: { $in: ["pending", "doctor_accepted", "patient_confirmed"] },
    });

    if (existingAppointment) {
      res.status(400).json({
        success: false,
        message: "This slot is already booked",
      });
      return;
    }

    // Get patient IP and geolocation
    const patientIp =
      req.ip ||
      req.connection.remoteAddress ||
      (req.headers["x-forwarded-for"] as string);
    const patientGeo = {
      type: "Point" as const,
      coordinates: patientAddress.location.coordinates,
    };

    // Create new appointment with only fixed cost
    const newAppointment = new HomeVisitAppointment({
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
      patientAddress: {
        line1: patientAddress.line1,
        line2: patientAddress.line2,
        landmark: patientAddress.landmark,
        locality: patientAddress.locality,
        city: patientAddress.city,
        pincode: patientAddress.pincode,
        country: patientAddress.country || "India",
        location: {
          type: "Point",
          coordinates: patientAddress.location.coordinates,
        },
      },
      status: "pending",
      pricing: {
        fixedCost,
        travelCost: 0,
        totalCost: fixedCost,
      },
      paymentDetails: {
        amount: fixedCost,
        walletDeducted: 0,
        paymentStatus: "pending",
      },
      doctorDistance,
      patientIp,
      patientGeo,
    });

    await newAppointment.save();

    // Populate the response
    const populatedAppointment = await HomeVisitAppointment.findById(
      newAppointment._id
    )
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
      });

    res.status(201).json({
      success: true,
      data: populatedAppointment,
      message: "Home visit request created successfully",
    });
  } catch (error: any) {
    console.error("Error booking home visit appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error creating home visit request",
      error: error.message,
    });
  }
};

// Step 2: Doctor accepts request and adds travel cost
export const acceptHomeVisitRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { appointmentId } = req.params;
    const parsed = homeVisitAppointmentAcceptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.errors,
      });
      return;
    }
    const { travelCost } = parsed.data;
    const doctorId = (req as any).user?.id;

    if (!doctorId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    // (travelCost validated by schema)

    const doctor = await Doctor.findOne({ userId: doctorId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Find the appointment
    const appointment = await HomeVisitAppointment.findOne({
      _id: appointmentId,
      doctorId: doctor._id,
      status: "pending",
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: "Appointment not found or not in pending status",
      });
      return;
    }

    // Update appointment with travel cost
    if (!appointment.pricing || !appointment.paymentDetails) {
      res.status(500).json({
        success: false,
        message: "Appointment pricing or payment details not found",
      });
      return;
    }

    const totalCost = appointment.pricing.fixedCost + travelCost;

    appointment.status = "doctor_accepted";
    appointment.pricing.travelCost = travelCost;
    appointment.pricing.totalCost = totalCost;
    appointment.paymentDetails.amount = totalCost;

    // Get doctor IP and geolocation
    appointment.doctorIp = getClientIp(req);

    if (doctor.homeVisit?.location && doctor.homeVisit.location.coordinates) {
      appointment.doctorGeo = {
        type: "Point",
        coordinates: doctor.homeVisit.location.coordinates,
      };
    }

    await appointment.save();

    // Populate the response
    const updatedAppointment = await populateAppointment(appointment._id);

    res.status(200).json({
      success: true,
      data: updatedAppointment,
      message: "Home visit request accepted with travel cost added",
    });
  } catch (error: any) {
    console.error("Error accepting home visit request:", error);
    res.status(500).json({
      success: false,
      message: "Error accepting request",
      error: error.message,
    });
  }
};

// Step 3: Patient confirms and pays total cost (frozen in wallet)
export const confirmHomeVisitAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { appointmentId } = req.params;
    // No body fields to validate here besides param; schema for confirm not needed (retained symmetry)
    const patientId = (req as any).user?.id;

    if (!patientId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    // Find the appointment
    const appointment = await HomeVisitAppointment.findOne({
      _id: appointmentId,
      patientId,
      status: "doctor_accepted",
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: "Appointment not found or not in correct status",
      });
      return;
    }

    // Check patient wallet balance
    const patient = await User.findById(patientId);
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    const totalCost = appointment.pricing?.totalCost || 0;

    // Check available balance (considering frozen amount)
    const availableBalance = (patient as any).getAvailableBalance
      ? (patient as any).getAvailableBalance()
      : patient.wallet - ((patient as any).frozenAmount || 0);

    if (availableBalance < totalCost) {
      res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
        data: {
          required: totalCost,
          available: availableBalance,
          totalWallet: patient.wallet,
          frozenAmount: (patient as any).frozenAmount || 0,
        },
      });
      return;
    }

    // Check pricing and payment details exist
    if (!appointment.pricing || !appointment.paymentDetails) {
      res.status(500).json({
        success: false,
        message: "Appointment pricing or payment details not found",
      });
      return;
    }

    // Freeze amount in wallet
    patient.wallet -= totalCost;
    (patient as any).frozenAmount =
      ((patient as any).frozenAmount || 0) + totalCost;
    await patient.save();

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpiration = getOTPExpirationTime();

    // Update appointment
    appointment.status = "patient_confirmed";
    appointment.paymentDetails.walletDeducted = totalCost;
    appointment.paymentDetails.paymentStatus = "frozen";
    appointment.otp = {
      code: otpCode,
      generatedAt: new Date(),
      expiresAt: otpExpiration,
      attempts: 0,
      maxAttempts: 3,
      isUsed: false,
    };

    await appointment.save();

    // Populate the response
    const confirmedAppointment = await populateAppointment(appointment._id);

    res.status(200).json({
      success: true,
      data: confirmedAppointment,
      message: "Home visit appointment confirmed and payment frozen",
    });
  } catch (error: any) {
    console.error("Error confirming home visit appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error confirming appointment",
      error: error.message,
    });
  }
};

// Step 4: Doctor completes appointment with OTP validation
export const completeHomeVisitAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { appointmentId } = req.params;
    const parsed = homeVisitAppointmentCompleteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.errors,
      });
      return;
    }
    const { otp } = parsed.data;
    const doctorId = (req as any).user?.id;

    if (!doctorId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (!otp) {
      res.status(400).json({
        success: false,
        message: "OTP is required",
      });
      return;
    }

    const doctor = await Doctor.findOne({ userId: doctorId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Find the appointment
    const appointment = await HomeVisitAppointment.findOne({
      _id: appointmentId,
      doctorId: doctor._id,
      status: "patient_confirmed",
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: "Appointment not found or not in confirmed status",
      });
      return;
    }

    // Validate OTP
    if (!appointment.otp || appointment.otp.isUsed) {
      res.status(400).json({
        success: false,
        message: "OTP is not available or already used",
      });
      return;
    }

    if (isOTPExpired(appointment.otp.expiresAt!)) {
      res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
      return;
    }

    if (
      isMaxAttemptsReached(
        appointment.otp.attempts,
        appointment.otp.maxAttempts
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Maximum OTP attempts exceeded",
      });
      return;
    }

    if (appointment.otp.code !== otp) {
      appointment.otp.attempts += 1;
      await appointment.save();

      res.status(400).json({
        success: false,
        message: "Invalid OTP",
        attemptsRemaining:
          appointment.otp.maxAttempts - appointment.otp.attempts,
      });
      return;
    }

    // OTP is valid, complete the appointment
    appointment.status = "completed";
    appointment.otp.isUsed = true;

    if (appointment.paymentDetails) {
      appointment.paymentDetails.paymentStatus = "completed";
    }
    await appointment.save();

    // Update patient's frozen amount
    const patient = await User.findById(appointment.patientId);
    if (patient && appointment.paymentDetails) {
      const frozenAmount = (patient as any).frozenAmount || 0;
      const appointmentAmount = appointment.paymentDetails.walletDeducted || 0;
      (patient as any).frozenAmount = Math.max(
        0,
        frozenAmount - appointmentAmount
      );
      await patient.save();
    }

    // Populate the response
    const completedAppointment = await populateAppointment(appointment._id);

    res.status(200).json({
      success: true,
      data: completedAppointment,
      message: "Home visit appointment completed successfully",
    });
  } catch (error: any) {
    console.error("Error completing home visit appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error completing appointment",
      error: error.message,
    });
  }
};

// Cancel appointment (by patient or doctor)
export const cancelHomeVisitAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { appointmentId } = req.params;
    const parsed = homeVisitAppointmentCancelSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.errors,
      });
      return;
    }
    // reason currently unused (no persistence field) – intentionally ignored to avoid lint warning
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    // Find the appointment
    const appointment = await HomeVisitAppointment.findById(appointmentId);
    if (!appointment) {
      res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
      return;
    }

    // Check if user is patient or doctor of this appointment
    const doctor = await Doctor.findOne({ userId });
    const isDoctor =
      doctor && doctor._id.toString() === appointment.doctorId.toString();
    const isPatient = appointment.patientId.toString() === userId;

    if (!isDoctor && !isPatient) {
      res.status(403).json({
        success: false,
        message: "Not authorized to cancel this appointment",
      });
      return;
    }

    // Check if appointment can be cancelled
    if (
      appointment.status === "completed" ||
      appointment.status === "cancelled"
    ) {
      res.status(400).json({
        success: false,
        message: "Cannot cancel completed or already cancelled appointment",
      });
      return;
    }

    // Refund frozen amount if payment was frozen
    if (appointment.paymentDetails?.paymentStatus === "frozen") {
      const patient = await User.findById(appointment.patientId);
      if (patient && appointment.paymentDetails) {
        const refundAmount = appointment.paymentDetails.walletDeducted || 0;
        patient.wallet += refundAmount;
        (patient as any).frozenAmount = Math.max(
          0,
          ((patient as any).frozenAmount || 0) - refundAmount
        );
        await patient.save();
      }
    }

    // Update appointment status
    appointment.status = "cancelled";
    if (appointment.paymentDetails) {
      appointment.paymentDetails.paymentStatus = "failed";
    }
    await appointment.save();

    // Populate the response
    const cancelledAppointment = await populateAppointment(appointment._id);

    res.status(200).json({
      success: true,
      data: cancelledAppointment,
      message: "Home visit appointment cancelled successfully",
    });
  } catch (error: any) {
    console.error("Error cancelling home visit appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling appointment",
      error: error.message,
    });
  }
};

// Get doctor appointments by date
export const getDoctorHomeVisitAppointmentByDate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { date } = req.body;
    const doctorId = (req as any).user?.id;

    if (!doctorId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (!date) {
      res.status(400).json({
        success: false,
        message: "Date is required",
      });
      return;
    }

    const doctor = await Doctor.findOne({ userId: doctorId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const appointments = await HomeVisitAppointment.find({
      doctorId: doctor._id,
      "slot.day": {
        $gte: startDate,
        $lte: endDate,
      },
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
      .sort({ "slot.time.start": 1 });

    res.status(200).json({
      success: true,
      data: appointments,
      message:
        "Doctor home visit appointments for the date retrieved successfully",
    });
  } catch (error: any) {
    console.error(
      "Error getting doctor home visit appointments by date:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Error retrieving appointments",
      error: error.message,
    });
  }
};

// Update home visit configuration for doctor
export const updateHomeVisitConfig = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const doctorId = (req as any).user?.id;
    const parsed = homeVisitConfigUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.errors,
      });
      return;
    }
    const { isActive, fixedPrice, availability, location } = parsed.data;

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
        message: "Doctor not found",
      });
      return;
    }

    // Update home visit configuration
    if (isActive !== undefined && doctor.homeVisit) {
      doctor.homeVisit.isActive = isActive;
    }
    if (fixedPrice !== undefined && doctor.homeVisit) {
      doctor.homeVisit.fixedPrice = fixedPrice;
    }
    if (availability && doctor.homeVisit) {
      // Cast because Mongoose DocumentArray typing may differ from plain parsed array
      (doctor.homeVisit as any).availability = availability as any;
    }
    if (location && location.coordinates && doctor.homeVisit) {
      doctor.homeVisit.location = {
        type: "Point",
        coordinates: location.coordinates,
      };
    }

    if (doctor.homeVisit) {
      doctor.homeVisit.updatedAt = new Date();
    }
    await doctor.save();

    res.status(200).json({
      success: true,
      data: doctor.homeVisit,
      message: "Home visit configuration updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating home visit configuration:", error);
    res.status(500).json({
      success: false,
      message: "Error updating configuration",
      error: error.message,
    });
  }
};

// Cron function to update expired appointments
export const updateHomeVisitAppointmentExpiredStatus =
  async (): Promise<void> => {
    try {
      const now = new Date();

      // Find appointments that should be expired
      const expiredAppointments = await HomeVisitAppointment.find({
        status: { $in: ["pending", "doctor_accepted", "patient_confirmed"] },
        "slot.time.end": { $lt: now },
      });

      for (const appointment of expiredAppointments) {
        // If payment was frozen and appointment is being expired, refund the patient
        if (appointment.paymentDetails?.paymentStatus === "frozen") {
          const patient = await User.findById(appointment.patientId);
          if (patient && appointment.paymentDetails) {
            const refundAmount = appointment.paymentDetails.walletDeducted || 0;
            patient.wallet += refundAmount;
            (patient as any).frozenAmount = Math.max(
              0,
              ((patient as any).frozenAmount || 0) - refundAmount
            );
            await patient.save();
          }
        }

        appointment.status = "expired";
        if (appointment.paymentDetails) {
          appointment.paymentDetails.paymentStatus = "failed";
        }
        await appointment.save();
      }

      console.log(
        `Updated ${expiredAppointments.length} expired home visit appointments`
      );
    } catch (error) {
      console.error("Error updating expired home visit appointments:", error);
    }
  };
