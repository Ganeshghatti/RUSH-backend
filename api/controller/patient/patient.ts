import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/user/user-model";
import Patient from "../../models/user/patient-model";
import Doctor from "../../models/user/doctor-model";
import OnlineAppointment from "../../models/appointment/online-appointment-model";
import ClinicAppointment from "../../models/appointment/clinic-appointment-model";
import {
  generateSignedUrlsForDoctor,
  generateSignedUrlsForUser,
} from "../../utils/signed-url";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import { convertMediaKeysToUrls } from "../appointment/emergency-appointment";
import {
  addHealthMetricsSchema,
  updateHealthMetricsSchema,
} from "../../validation/validation";
import { HealthMetrics } from "../../models/health-metrics-model";

export const getPatientById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid patient ID format",
      });
      return;
    }

    // Find patient by patient ID and populate user details
    const patient = await Patient.findById(id)
      .populate({
        path: "userId",
        select: "-password",
      })
      .select("-password");

    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    // Generate signed URLs for the patient data
    const patientWithSignedUrls = await generateSignedUrlsForUser(patient);

    res.status(200).json({
      success: true,
      message: "Patient details fetched successfully",
      data: patientWithSignedUrls,
    });
  } catch (error) {
    console.error("Error fetching patient details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch patient details",
    });
  }
};

export const patientOnboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const {
      prefix,
      profilePic,
      gender,
      dob,
      address,
      personalIdProof,
      addressProof,
      bankDetails,
      mapLocation,
      insurance,
      healthMetrics,
    } = req.body;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
      return;
    }

    // Check if user exists and has patient role
    const user = await User.findOne({ _id: userId });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found or not a patient",
      });
      return;
    }

    // Validate required fields
    if (!gender || !dob || !address) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    // Prepare update data
    const updateData = {
      prefix,
      profilePic,
      gender,
      dob: new Date(dob),
      address,
      personalIdProof,
      addressProof,
      bankDetails,
      mapLocation,
      insurance,
      healthMetrics: healthMetrics,
    };

    // Update patient using discriminator model
    const updatedPatient = await Patient.findOneAndUpdate(
      { userId },
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        select: "-password",
      }
    );

    if (!updatedPatient) {
      res.status(500).json({
        success: false,
        message: "Failed to update patient information",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Patient onboarded successfully",
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error in patient onboarding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to onboard patient",
      error: (error as Error).message,
    });
  }
};

export const getPatientDashboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    const patient = await Patient.findOne({ userId }).populate(
      "userId",
      "firstName lastName profilePic"
    );

    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    // pending
    // Find all emergency appointments for this patient
    const appointments = await EmergencyAppointment.find({
      patientId: patient._id,
      status: { $in: ["in-progress", "pending"] },
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
    const emergencyAppointmentsWithUrls = await convertMediaKeysToUrls(
      appointments
    );

    const currentDate = new Date();

    // Get online appointment counts
    const [upcomingOnline, completedOnline, cancelledOnline, allOnline] =
      await Promise.all([
        // Upcoming online appointments (accepted and time is in future)
        OnlineAppointment.countDocuments({
          patientId: userId,
          status: "accepted",
          "slot.time.start": { $gte: currentDate },
        }),
        // Completed online appointments (accepted and time is in past)
        OnlineAppointment.countDocuments({
          patientId: userId,
          status: "accepted",
          "slot.time.start": { $lt: currentDate },
        }),
        // Cancelled online appointments (rejected)
        OnlineAppointment.countDocuments({
          patientId: userId,
          status: "rejected",
        }),
        // All online appointments for the patient
        OnlineAppointment.countDocuments({
          patientId: userId,
        }),
      ]);

    // Get clinic appointment counts
    const [upcomingClinic, completedClinic, cancelledClinic, allClinic] =
      await Promise.all([
        // Upcoming clinic appointments (confirmed and day is today or in future)
        ClinicAppointment.countDocuments({
          patientId: userId,
          status: "confirmed",
          "slot.day": { $gte: new Date(currentDate.toDateString()) },
        }),
        // Completed clinic appointments
        ClinicAppointment.countDocuments({
          patientId: userId,
          status: "completed",
        }),
        // Cancelled clinic appointments
        ClinicAppointment.countDocuments({
          patientId: userId,
          status: "cancelled",
        }),
        // All clinic appointments for the patient
        ClinicAppointment.countDocuments({
          patientId: userId,
        }),
      ]);

    // Get emergency appointment counts
    const [
      pendingEmergency,
      inProgressEmergency,
      completedEmergency,
      allEmergency,
    ] = await Promise.all([
      // Pending emergency appointments
      EmergencyAppointment.countDocuments({
        patientId: patient._id,
        status: "pending",
      }),
      // In-progress emergency appointments
      EmergencyAppointment.countDocuments({
        patientId: patient._id,
        status: "in-progress",
      }),
      // Completed emergency appointments
      EmergencyAppointment.countDocuments({
        patientId: patient._id,
        status: "completed",
      }),
      // All emergency appointments
      EmergencyAppointment.countDocuments({
        patientId: patient._id,
      }),
    ]);

    // Combine all appointment types counts
    const appointmentCounts = {
      upcoming: upcomingOnline + pendingEmergency + upcomingClinic, // Include confirmed clinic appointments
      completed: completedOnline + completedEmergency + completedClinic,
      cancelled: cancelledOnline + cancelledClinic, // Both online and clinic appointments can be cancelled
      all: allOnline + allEmergency + allClinic, // Total of all appointments
    };

    // Get recommended doctors based on patient's health conditions
    let recommendedDoctors: any[] = [];

    // if (patient.healthMetrics && patient.healthMetrics.length > 0) {
    //   // Get latest health metrics
    //   const latestHealthMetrics = patient.healthMetrics[patient.healthMetrics.length - 1];

    //   if (latestHealthMetrics.conditions && latestHealthMetrics.conditions.length > 0) {
    //     // Find doctors whose specialization matches patient's conditions
    //     const patientConditions = latestHealthMetrics.conditions.map(condition =>
    //       new RegExp(condition, 'i') // Case insensitive matching
    //     );

    //     recommendedDoctors = await Doctor.find({
    //       status: "approved",  // Only show approved doctors
    //       subscriptions: { $exists: true, $not: { $size: 0 } }, // Only show doctors with at least one subscription
    //       $or: [
    //         { specialization: { $in: patientConditions } },
    //         { "registration.specialization": { $in: patientConditions } }
    //       ]
    //     })
    //     .populate('userId', 'firstName lastName profilePic')
    //     .select('userId specialization experience onlineAppointment')
    //     .limit(10);
    //   }
    // }

    // If no condition-based recommendations, get general recommended doctors
    if (recommendedDoctors.length === 0) {
      recommendedDoctors = await Doctor.find({
        status: "approved", // Only show approved doctors
        subscriptions: { $exists: true, $not: { $size: 0 } }, // Only show doctors with at least one subscription
      })
        .populate("userId", "firstName lastName profilePic")
        .select("userId specialization experience onlineAppointment")
        .limit(10);
    }

    // Process recommended doctors to add signed URLs
    const processedDoctors = await Promise.all(
      recommendedDoctors.map((doctor) => generateSignedUrlsForDoctor(doctor))
    );

    res.status(200).json({
      success: true,
      message: "Patient dashboard data retrieved successfully",
      data: {
        appointmentCounts,
        emergencyAppointments: emergencyAppointmentsWithUrls,
        recommendedDoctors: processedDoctors,
      },
    });
  } catch (error) {
    console.error("Error getting patient dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get patient dashboard data",
      error: (error as Error).message,
    });
  }
};

export const getAppointmentsDoctorForPatient = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    // Get online appointments
    const onlineAppointments = await OnlineAppointment.find({
      patientId: userId,
    }).populate({
      path: "doctorId",
      select: "specialization experience userId onlineAppointment",
      populate: {
        path: "userId",
        select: "firstName lastName profilePic",
      },
    });

    // Get clinic appointments
    const clinicAppointments = await ClinicAppointment.find({
      patientId: userId,
    }).populate({
      path: "doctorId",
      select: "specialization experience userId clinicVisit",
      populate: {
        path: "userId",
        select: "firstName lastName profilePic",
      },
    });

    // Add appointment type to differentiate between online and clinic appointments
    const onlineAppointmentsWithType = onlineAppointments.map(
      (appointment) => ({
        ...appointment.toObject(),
        appointmentType: "online",
      })
    );

    // Add clinic details and appointment type to clinic appointments
    const clinicAppointmentsWithType = clinicAppointments.map((appointment) => {
      const appointmentObj = appointment.toObject();
      const doctor = appointmentObj.doctorId as any;
      const clinicVisit = doctor?.clinicVisit as any;
      const clinic = (clinicVisit?.clinics || []).find(
        (c: any) => c._id.toString() === appointment.clinicId
      );

      return {
        ...appointmentObj,
        appointmentType: "clinic",
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

    // Combine all appointments
    const allAppointments = [
      ...onlineAppointmentsWithType,
      ...clinicAppointmentsWithType,
    ];

    // Generate signed URLs for profile pictures
    const appointmentsWithSignedUrls = await Promise.all(
      allAppointments.map(async (appointment) => {
        if (appointment.doctorId) {
          appointment.doctorId = await generateSignedUrlsForDoctor(
            appointment.doctorId
          );
        }
        return appointment;
      })
    );

    // Sort by creation date (most recent first)
    appointmentsWithSignedUrls.sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );

    res.status(200).json({
      success: true,
      message: "Appointments for patient retrieved successfully",
      data: appointmentsWithSignedUrls,
    });
  } catch (error) {
    console.error("Error in getting appointments for patient:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get appointments for patient",
      error: (error as Error).message,
    });
  }
};

export const updateHealthMetrics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    // Validate request body
    const validationResult = updateHealthMetricsSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
      return;
    }

    // Find patient by userId
    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    const updateData = validationResult.data;

    // Try to find existing health metrics for this patient
    let healthMetrics = await HealthMetrics.findOne({ patientId: patient._id });

    if (healthMetrics) {
      // Update existing health metrics document
      healthMetrics = await HealthMetrics.findOneAndUpdate(
        { patientId: patient._id },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: "Health metrics updated successfully",
        data: healthMetrics,
      });
    } else {
      // Create new health metrics document if none exists
      healthMetrics = new HealthMetrics({
        patientId: patient._id,
        ...updateData,
      });

      const savedHealthMetrics = await healthMetrics.save();

      patient.healthMetricsId = savedHealthMetrics._id;

      await patient.save();

      res.status(201).json({
        success: true,
        message: "Health metrics created successfully",
        data: savedHealthMetrics,
      });
    }
  } catch (error) {
    console.error("Error updating health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update health metrics",
      error: (error as Error).message,
    });
  }
};

export const getHealthMetrics = async (
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

    // Find health metrics for this patient
    const healthMetrics = await HealthMetrics.findOne({
      patientId: patient._id,
    });

    if (!healthMetrics) {
      res.status(404).json({
        success: false,
        message: "Health metrics not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Health metrics retrieved successfully",
      data: healthMetrics,
    });
  } catch (error) {
    console.error("Error fetching health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch health metrics",
      error: (error as Error).message,
    });
  }
};
