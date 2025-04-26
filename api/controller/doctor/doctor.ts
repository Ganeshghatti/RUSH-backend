import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/user/user-model";
import Doctor from "../../models/user/doctor-model";

export const doctorOnboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const {
      prefix,
      firstName,
      lastName,
      profilePic,
      gender,
      dob,
      address,
      personalIdProof,
      addressProof,
      bankDetails,
      qualifications,
      registration,
      experience,
      taxProof,
      awards,
      isSubscribed,
      subscriptions,
    } = req.body;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
      return;
    }

    // Check if user exists and has doctor role
    const user = await User.findOne({ _id: userId, role: "doctor" });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found or not a doctor",
      });
      return;
    }

    // Validate required fields
    if (!firstName || !lastName || !gender || !dob || !address || !qualifications || !registration || !experience || !bankDetails) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    // Prepare update data
    const updateData = {
      prefix,
      firstName,
      lastName,
      profilePic,
      gender,
      dob: new Date(dob),
      address,
      personalIdProof,
      addressProof,
      bankDetails,
      qualifications: qualifications,
      registration: registration,
      experience: experience,
      taxProof,
      awards: awards,
    };

    // Update doctor using discriminator model
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password"); // Exclude password from response

    if (!updatedDoctor) {
      res.status(500).json({
        success: false,
        message: "Failed to update doctor information",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Doctor onboarded successfully",
      data: updatedDoctor,
    });
  } catch (error) {
    console.error("Error in doctor onboarding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to onboard doctor",
      error: (error as Error).message,
    });
  }
};