import { Request, Response } from "express";
import OnlineAppointment from "../../models/appointment/online-appointment-model";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import ClinicAppointment from "../../models/appointment/clinic-appointment-model";
import HomeVisitAppointment from "../../models/appointment/homevisit-appointment-model";
import Doctor from "../../models/user/doctor-model";
import Patient from "../../models/user/patient-model";
import User from "../../models/user/user-model";

// Book appointment by patient
export const bookOnlineAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { doctorId, slot } = req.body;
    const patientId = req.user.id;

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
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
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

    if (patient.wallet < price) {
      res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
      return;
    }

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
    });

    await newAppointment.save();

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

    // Find all online appointments for this doctor
    const onlineAppointments = await OnlineAppointment.find({
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

    // Find all emergency appointments for this doctor
    const emergencyAppointments = await EmergencyAppointment.find({
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

    // Find all clinic appointments for this doctor
    const clinicAppointments = await ClinicAppointment.find({
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

    console.log("Clinic appointments for doctor", clinicAppointments);

    // Find all home visit appointments for this doctor
    const homeVisitAppointments = await HomeVisitAppointment.find({
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
      .sort({ "slot.day": 1, "slot.time.start": 1 }); // Sort by date and time

    res.status(200).json({
      success: true,
      onlineAppointment: onlineAppointments,
      emergencyAppointment: emergencyAppointments,
      clinicAppointment: clinicAppointments,
      homeVisitAppointment: homeVisitAppointments,
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

    // Find all online appointments for this patient (patientId references User)
    const onlineAppointments = await OnlineAppointment.find({
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

    // Find all emergency appointments for this patient (patientId references Patient)
    const emergencyAppointments = await EmergencyAppointment.find({
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

    // Find all clinic appointments for this patient
    const clinicAppointments = await ClinicAppointment.find({
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
    console.log("Clinic appointments for patient", clinicAppointments);

    // Find all home visit appointments for this patient
    const homeVisitAppointments = await HomeVisitAppointment.find({
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
      .sort({ "slot.day": 1, "slot.time.start": 1 });

    res.status(200).json({
      success: true,
      onlineAppointment: onlineAppointments,
      emergencyAppointment: emergencyAppointments,
      clinicAppointment: clinicAppointments,
      homeVisitAppointment: homeVisitAppointments,
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

// Update appointment status by doctor
export const updateAppointmentStatus = async (
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

    // 💰 Only on 'accepted' status: handle wallet deduction
    if (status === "accepted") {
      const patient = await User.findById(appointment.patientId);
      if (!patient) {
        res.status(404).json({
          success: false,
          message: "Patient not found",
        });
        return;
      }

      // 🧠 Find matched price for the slot duration
      const matched = doctor?.onlineAppointment?.duration.find(
        (d: any) => d.minute === appointment?.slot?.duration
      );

      if (!matched) {
        res.status(400).json({
          success: false,
          message: "Doctor does not support this appointment duration",
        });
        return;
      }

      const price = matched.price;

      if (patient.wallet < price) {
        res.status(400).json({
          success: false,
          message: "Patient has insufficient wallet balance",
        });
        return;
      }

      // 💳 Deduct amount and save patient
      patient.wallet -= price;
      await patient.save();
    }

    // ✅ Update status
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
