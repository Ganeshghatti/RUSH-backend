import { Request, Response } from "express";
import Subscription from "../../models/subscription-model";

export const createSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, price, type, interval, startDate, endDate, isActive, paymentId } = req.body;

    // Validate required fields
    if (!userId || !price ) {
      res.status(400).json({
        success: false,
        message: "Missing required subscription fields",
      });
      return;
    }

    // Create new subscription
    const subscription = new Subscription({
      userId,
      price,
      type,
      interval,
      startDate: startDate || Date.now(),
      endDate,
      isActive: isActive !== undefined ? isActive : true,
      paymentId,
    });

    await subscription.save();

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