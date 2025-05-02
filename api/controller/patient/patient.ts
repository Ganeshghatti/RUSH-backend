import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/user/user-model";
import Patient from "../../models/user/patient-model";

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