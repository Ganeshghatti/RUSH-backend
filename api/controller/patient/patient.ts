import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/user/user-model";
import Patient from "../../models/user/patient-model";
import Doctor from "../../models/user/doctor-model";
import OnlineAppointment from "../../models/appointment/online-appointment-model";
import Booking from "../../models/user/booking-model";

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

    const currentDate = new Date();
    const onlineAppointmentCounts = await Promise.all([
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

    const appointmentCounts = {
      upcoming: onlineAppointmentCounts[0],
      completed: onlineAppointmentCounts[1],
      cancelled: onlineAppointmentCounts[2],
      all: onlineAppointmentCounts[3]
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
          status: "approved",
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
        status: "approved",
        "onlineAppointment.isActive": true
      })
      .populate('userId', 'firstName lastName profilePic')
      .select('userId specialization experience onlineAppointment')
      .sort({ createdAt: -1 })
      .limit(10);
    }

    res.status(200).json({
      success: true,
      message: "Patient dashboard data retrieved successfully",
      data: {
        appointmentCounts,
        recommendedDoctors: recommendedDoctors
      }
    });

  } catch (error) {
    console.error("Error in getting patient dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get patient dashboard data",
      error: (error as Error).message,
    });
  }
}

export const getAppointmentsDoctorForPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const doctors = await OnlineAppointment.find({ patientId: userId }).populate('doctorId', 'specialization experience userId onlineAppointment').populate('doctorId.userId', 'firstName lastName profilePic');

    res.status(200).json({
      success: true,
      message: "Appoinments doctor for patient retrieved successfully",
      data: doctors
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