import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/user/user-model";
import Patient from "../../models/user/patient-model";
import Doctor from "../../models/user/doctor-model";
import OnlineAppointment from "../../models/appointment/online-appointment-model";
import { generateSignedUrlsForDoctor, generateSignedUrlsForUser } from "../../utils/signed-url";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import { convertMediaKeysToUrls } from "../appointment/emergency-appointment";
import { addHealthMetricsSchema } from "../../validation/validation";

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
        path: 'userId',
        select: '-password'
      })
      .select('-password');

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

export const patientOnboard = async (req: Request, res: Response): Promise<void> => {
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
        select: '-password'
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

export const getPatientDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const patient = await Patient.findOne({ userId }).populate('userId', 'firstName lastName profilePic');
    
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
      status: { $in: ["in-progress", "pending"] }
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
    const emergencyAppointmentsWithUrls = await convertMediaKeysToUrls(appointments);

    const currentDate = new Date();

    // Get online appointment counts
    const [upcomingOnline, completedOnline, cancelledOnline, allOnline] = await Promise.all([
      // Upcoming online appointments (accepted and time is in future)
      OnlineAppointment.countDocuments({
        patientId: userId,
        status: "accepted",
        "slot.time.start": { $gte: currentDate }
      }),
      // Completed online appointments (accepted and time is in past)
      OnlineAppointment.countDocuments({
        patientId: userId,
        status: "accepted",
        "slot.time.start": { $lt: currentDate }
      }),
      // Cancelled online appointments (rejected)
      OnlineAppointment.countDocuments({
        patientId: userId,
        status: "rejected"
      }),
      // All online appointments for the patient
      OnlineAppointment.countDocuments({
        patientId: userId
      })
    ]);

    // Get emergency appointment counts
    const [pendingEmergency, inProgressEmergency, completedEmergency, allEmergency] = await Promise.all([
      // Pending emergency appointments
      EmergencyAppointment.countDocuments({
        patientId: patient._id,
        status: "pending"
      }),
      // In-progress emergency appointments
      EmergencyAppointment.countDocuments({
        patientId: patient._id,
        status: "in-progress"
      }),
      // Completed emergency appointments
      EmergencyAppointment.countDocuments({
        patientId: patient._id,
        status: "completed"
      }),
      // All emergency appointments
      EmergencyAppointment.countDocuments({
        patientId: patient._id
      })
    ]);

    // Combine both appointment types counts
    const appointmentCounts = {
      upcoming: upcomingOnline + pendingEmergency, // Include both pending and in-progress emergency as upcoming
      completed: completedOnline + completedEmergency,
      cancelled: cancelledOnline, // Only online appointments can be cancelled
      all: allOnline + allEmergency // Total of all appointments
    };

    // Get recommended doctors based on patient's health conditions
    let recommendedDoctors: any[] = [];
    
    if (patient.healthMetrics && patient.healthMetrics.length > 0) {
      // Get latest health metrics
      const latestHealthMetrics = patient.healthMetrics[patient.healthMetrics.length - 1];
      
      if (latestHealthMetrics.conditions && latestHealthMetrics.conditions.length > 0) {
        // Find doctors whose specialization matches patient's conditions
        const patientConditions = latestHealthMetrics.conditions.map(condition => 
          new RegExp(condition, 'i') // Case insensitive matching
        );
        
        recommendedDoctors = await Doctor.find({
          status: "approved",  // Only show approved doctors
          subscriptions: { $exists: true, $not: { $size: 0 } }, // Only show doctors with at least one subscription
          $or: [
            { specialization: { $in: patientConditions } },
            { "registration.specialization": { $in: patientConditions } }
          ]
        })
        .populate('userId', 'firstName lastName profilePic')
        .select('userId specialization experience onlineAppointment')
        .limit(10);
      }
    }

    // If no condition-based recommendations, get general recommended doctors
    if (recommendedDoctors.length === 0) {
      recommendedDoctors = await Doctor.find({
        status: "approved",  // Only show approved doctors
        subscriptions: { $exists: true, $not: { $size: 0 } }, // Only show doctors with at least one subscription
      })
        .populate('userId', 'firstName lastName profilePic')
        .select('userId specialization experience onlineAppointment')
        .limit(10);
    }

    // Process recommended doctors to add signed URLs
    const processedDoctors = await Promise.all(
      recommendedDoctors.map(doctor => generateSignedUrlsForDoctor(doctor))
    );

    res.status(200).json({
      success: true,
      message: "Patient dashboard data retrieved successfully",
      data: {
        appointmentCounts,
        emergencyAppointments: emergencyAppointmentsWithUrls,
        recommendedDoctors: processedDoctors
      }
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

export const getAppointmentsDoctorForPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const appointments = await OnlineAppointment.find({ patientId: userId }).populate({
      path: 'doctorId',
      select: 'specialization experience userId onlineAppointment',
      populate: {
        path: 'userId',
        select: 'firstName lastName profilePic'
      }
    });

    // Generate signed URLs for profile pictures
    const appointmentsWithSignedUrls = await Promise.all(
      appointments.map(async (appointment) => {
        const appointmentObj = appointment.toObject();
        if (appointmentObj.doctorId) {
          appointmentObj.doctorId = await generateSignedUrlsForDoctor(appointmentObj.doctorId);
        }
        return appointmentObj;
      })
    );

    res.status(200).json({
      success: true,
      message: "Appoinments doctor for patient retrieved successfully",
      data: appointmentsWithSignedUrls
    });
    
  } catch (error) {
    console.error("Error in getting appoinments doctor for patient:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get appoinments doctor for patient",
      error: (error as Error).message,
    });
  }
}

export const addHealthMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    // Validate request body
    const validationResult = addHealthMetricsSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
      return;
    }

    const { bloodPressure, bloodGlucose, weight, height, bloodGroup, conditions } = validationResult.data;

    // Find patient by userId
    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    // Create new health metric entry
    const newHealthMetric = {
      bloodPressure,
      bloodGlucose,
      weight,
      height,
      bloodGroup,
      conditions,
      reportDate: new Date(),
    };

    // Add health metric to patient's healthMetrics array
    const updatedPatient = await Patient.findOneAndUpdate(
      { userId },
      { $push: { healthMetrics: newHealthMetric } },
      { new: true, runValidators: true }
    );

    if (!updatedPatient) {
      res.status(500).json({
        success: false,
        message: "Failed to add health metrics",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Health metrics added successfully",
      data: {
        healthMetrics: updatedPatient.healthMetrics[updatedPatient.healthMetrics.length - 1]
      },
    });
  } catch (error) {
    console.error("Error adding health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add health metrics",
      error: (error as Error).message,
    });
  }
};