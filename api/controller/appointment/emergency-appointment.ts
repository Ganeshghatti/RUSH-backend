import { Request, Response } from "express";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import Patient from "../../models/user/patient-model";
import Doctor from "../../models/user/doctor-model";
import User from "../../models/user/user-model";
import { createEmergencyAppointmentSchema } from "../../validation/validation";
import twilio from "twilio";
import { GetSignedUrl } from "../../utils/aws_s3/upload-media";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Helper function to convert media keys and profile pic to signed URLs
const convertMediaKeysToUrls = async (appointments: any[]) => {
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
                console.error(`Error generating signed URL for key ${key}:`, error);
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

    // Check user's wallet balance
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check if user has sufficient balance (2500)
    if (user.wallet < 2500) {
      res.status(400).json({
        success: false,
        message:
          "Insufficient wallet balance. Please add money to your wallet. Required balance: ₹2500",
        data: {
          currentBalance: user.wallet,
          requiredBalance: 2500,
        },
      });
      return;
    }

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
    });

    await newEmergencyAppointment.save();

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
    const appointmentsWithUrls = await convertMediaKeysToUrls([populatedAppointment]);

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
    // Find all emergency appointments with filters
    const appointments = await EmergencyAppointment.find()
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

export const acceptEmergencyAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find doctor by userId
    const doctor = await Doctor.findOne({ userId });
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

    // Find patient and check wallet balance
    const patient = await Patient.findById(emergencyAppointment.patientId);
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    const user = await User.findById(patient.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "Patient user not found",
      });
      return;
    }

    // Check if patient has sufficient balance (2500)
    if (user.wallet < 2500) {
      res.status(400).json({
        success: false,
        message: "Patient has insufficient wallet balance",
        data: {
          currentBalance: user.wallet,
          requiredBalance: 2500,
        },
      });
      return;
    }

    // Create Twilio room for emergency consultation
    const roomName = `emergency_${id}`;
    const room = await client.video.rooms.create({
      uniqueName: roomName,
      type: "group",
      maxParticipants: 2,
    });

    // Deduct amount from patient's wallet
    user.wallet -= 2500;
    await user.save();

    // Update the emergency appointment with doctor info
    emergencyAppointment.doctorId = doctor._id;
    emergencyAppointment.status = "in-progress";
    emergencyAppointment.roomName = room.uniqueName;
    await emergencyAppointment.save();

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


