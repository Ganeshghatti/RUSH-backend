import { Request, Response } from "express";
import DoctorSubscription from "../../models/subscription-model";


export const createSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { price, name, description, features, isActive, duration } = req.body;

    // Validate required fields
    if (!price || !name || !description || !duration) {
      res.status(400).json({
        success: false,
        message: "Missing required subscription fields: price, name, description, and duration are required",
      });
      return;
    }

    const subscription = await DoctorSubscription.create({
      price,
      name,
      description,
      features: features || [], 
      isActive: isActive,
      duration,
    });

    res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create subscription",
    });
  }
};

export const updateSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined || typeof isActive !== "boolean") {
      res.status(400).json({
        success: false,
        message: "isActive field is required and must be a boolean",
      });
      return;
    }

    const subscription = await DoctorSubscription.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update subscription",
    });
  }
};