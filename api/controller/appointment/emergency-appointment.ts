import { Request, Response } from "express";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import Patient from "../../models/user/patient-model";
import { createEmergencyAppointmentSchema } from "../../validation/validation";

export const createEmergencyAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validate request body
    const validationResult = createEmergencyAppointmentSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
      return;
    }

    const { title, description, media, location, contactNumber, name } = validationResult.data;
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

    res.status(201).json({
      success: true,
      data: populatedAppointment,
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

    res.status(200).json({
      success: true,
      data: appointments,
      count: appointments.length,
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
    const appointments = await EmergencyAppointment.find({ patientId: patient._id })
      .populate({
        path: "patientId",
        select: "userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode phone email profilePic",
        },
      })
      .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({
      success: true,
      data: appointments,
      count: appointments.length,
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
