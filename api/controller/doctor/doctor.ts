import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/user/user-model";
import Doctor from "../../models/user/doctor-model";
import DoctorSubscription from "../../models/subscription-model";

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

export const subscribeDoctor = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const { doctorId } = req.params;

    const { subscriptionId, paymentId } = req.body;

    if (!doctorId || !subscriptionId || !paymentId) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    // Find doctor
    const doctor:any = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Find subscription
    const subscription = await DoctorSubscription.findById(subscriptionId);
    if (!subscription) {
      res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
      return;
    }

    if (!subscription.isActive) {
      res.status(400).json({
        success: false,
        message: "Subscription plan is not active",
      });
      return;
    }

    // Calculate end date based on subscription duration
    const startDate = new Date();
    let endDate: Date | undefined;

    switch (subscription.duration) {
      case "1 month":
        endDate = new Date(startDate.setMonth(startDate.getMonth() + 1));
        break;
      case "3 months":
        endDate = new Date(startDate.setMonth(startDate.getMonth() + 3));
        break;
      case "1 year":
        endDate = new Date(startDate.setFullYear(startDate.getFullYear() + 1));
        break;
      case "2 years":
        endDate = new Date(startDate.setFullYear(startDate.getFullYear() + 2));
        break;
      case "lifetime":
        endDate = undefined; // No end date for lifetime
        break;
      default:
        res.status(400).json({
          success: false,
          message: "Invalid subscription duration",
        });
        return;
    }

    // Create new subscription entry
    const newSubscription = {
      planName: subscription.name,
      startDate: new Date(),
      endDate,
      isActive: true,
      paymentId,
      SubscriptionId: subscription._id,
    };

    // Add subscription to doctor's subscriptions array
    await doctor.subscriptions.push(newSubscription);

    // Save the updated doctor document
    await doctor.save();

    res.status(200).json({
      success: true,
      message: "Doctor subscribed successfully",
      data: {
        doctorId: doctor._id,
        subscription: newSubscription,
      },
    });
  } catch (error) {
    console.error("Error in subscribing doctor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to subscribe doctor",
      error: (error as Error).message,
    });
  }
};