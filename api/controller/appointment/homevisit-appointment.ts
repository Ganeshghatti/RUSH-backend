import { Request, Response } from "express";
import HomeVisitAppointment from "../../models/appointment/homevisit-appointment-model";
import Doctor from "../../models/user/doctor-model";
import Patient from "../../models/user/patient-model";
import User from "../../models/user/user-model";
import { generateOTP } from "../../utils/otp-utils";

// Book appointment by patient
export const bookHomeVisitAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { doctorId, slot, patientAddress } = req.body;
    const patientId = req.user.id;

    // Validate required fields
    if (!doctorId || !slot || !patientAddress) {
      res.status(400).json({
        success: false,
        message:
          "Doctor ID, slot information, and patient address are required",
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

    if (
      !patientAddress.line1 ||
      !patientAddress.locality ||
      !patientAddress.city ||
      !patientAddress.pincode
    ) {
      res.status(400).json({
        success: false,
        message: "Patient address (line1, locality, city, pincode) is required",
      });
      return;
    }

    if (
      !patientAddress.location ||
      !patientAddress.location.coordinates ||
      patientAddress.location.coordinates.length !== 2
    ) {
      res.status(400).json({
        success: false,
        message:
          "Patient address location coordinates [longitude, latitude] are required",
      });
      return;
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Check if doctor has home visit enabled
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

    // Calculate total price
    const fixedPrice = doctor.homeVisit?.fixedPrice || 0;
    const travelCost = doctor.homeVisit?.travelCost || 0;
    const total = fixedPrice + travelCost;

    if (patient.wallet < total) {
      res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
      return;
    }

    // Check if the slot is already booked
    const existingAppointment = await HomeVisitAppointment.findOne({
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

    // Get patient IP and geolocation
    const patientIp =
      req.ip ||
      req.connection.remoteAddress ||
      (req.headers["x-forwarded-for"] as string);
    const patientGeo = {
      type: "Point",
      coordinates: patientAddress.location.coordinates,
    };

    // Create new appointment
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
      history: slot.history ? { title: slot.history.title } : undefined,
      status: "pending",
      paymentDetails: {
        fixedPrice,
        travelCost,
        total,
        walletFrozen: false,
        paymentStatus: "pending",
      },
      patientIp,
      patientGeo,
    });

    await newAppointment.save();

    // Populate the response with detailed patient and doctor information
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
      message: "Home visit appointment booked successfully",
    });
  } catch (error: any) {
    console.error("Error booking home visit appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error booking appointment",
      error: error.message,
    });
  }
};

// Update appointment status by doctor
export const updateHomeVisitAppointmentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;
    const doctorId = req.user.id; // Assuming the logged-in user is a doctor

    // Validate status
    if (!status || !["pending", "accepted", "rejected"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Valid status (pending, accepted, rejected) is required",
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

    // Find the appointment and verify it belongs to this doctor
    const appointment = await HomeVisitAppointment.findOne({
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

    // 💰 Only on 'accepted' status: handle wallet freezing and OTP generation
    if (status === "accepted") {
      const patient = await User.findById(appointment.patientId);
      if (!patient) {
        res.status(404).json({
          success: false,
          message: "Patient not found",
        });
        return;
      }

      const total = appointment.paymentDetails?.total || 0;

      if (patient.wallet < total) {
        res.status(400).json({
          success: false,
          message: "Patient has insufficient wallet balance",
        });
        return;
      }

      // 💳 Freeze amount in patient's wallet
      patient.wallet -= total;
      if (appointment.paymentDetails) {
        appointment.paymentDetails.walletFrozen = true;
        appointment.paymentDetails.paymentStatus = "frozen";
      }
      await patient.save();

      // 🔐 Generate OTP
      const otpCode = generateOTP();
      appointment.otp = {
        code: otpCode,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        attempts: 0,
        maxAttempts: 3,
        isUsed: false,
      };

      // Get doctor IP and geolocation
      const doctorIp =
        req.ip ||
        req.connection.remoteAddress ||
        (req.headers["x-forwarded-for"] as string);
      // For doctor geolocation, you might want to use their current location or clinic location
      appointment.doctorIp = doctorIp;
      if (doctor.homeVisit?.location && doctor.homeVisit.location.coordinates) {
        appointment.doctorGeo = {
          type: "Point",
          coordinates: doctor.homeVisit.location.coordinates,
        };
      }
    }

    // ✅ Update status
    appointment.status = status;
    await appointment.save();

    // Populate the response with detailed patient and doctor information
    const updatedAppointment = await HomeVisitAppointment.findById(
      appointment._id
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

    res.status(200).json({
      success: true,
      data: updatedAppointment,
      message: `Home visit appointment status updated to ${status} successfully`,
    });
  } catch (error: any) {
    console.error("Error updating home visit appointment status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating appointment status",
      error: error.message,
    });
  }
};

// Complete appointment with OTP validation
export const completeHomeVisitAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { appointmentId } = req.params;
    const { otp } = req.body;
    const doctorId = req.user.id;

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
      status: "accepted",
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: "Appointment not found or not in accepted status",
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

    if (appointment.otp.expiresAt && new Date() > appointment.otp.expiresAt) {
      res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
      return;
    }

    if (appointment.otp.attempts >= appointment.otp.maxAttempts) {
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

    // Populate the response
    const completedAppointment = await HomeVisitAppointment.findById(
      appointment._id
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

// Get doctor appointments by date
export const getDoctorHomeVisitAppointmentByDate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { date } = req.body;
    const doctorId = req.user.id;

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
    const doctorId = req.user.id;
    const { isActive, fixedPrice, travelCost, availability, location } =
      req.body;

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
    if (travelCost !== undefined && doctor.homeVisit) {
      doctor.homeVisit.travelCost = travelCost;
    }
    if (availability && doctor.homeVisit) {
      doctor.homeVisit.availability = availability;
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
        status: { $in: ["pending", "accepted"] },
        "slot.time.end": { $lt: now },
      });

      for (const appointment of expiredAppointments) {
        // If payment was frozen and appointment is being expired, refund the patient
        if (
          appointment.paymentDetails?.walletFrozen &&
          appointment.paymentDetails?.paymentStatus === "frozen"
        ) {
          const patient = await User.findById(appointment.patientId);
          if (patient && appointment.paymentDetails) {
            patient.wallet += appointment.paymentDetails.total;
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
