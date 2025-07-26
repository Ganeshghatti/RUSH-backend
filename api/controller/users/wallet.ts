import { razorpayConfig } from './../../config/razorpay';
import { Request, Response } from "express";
import User from "../../models/user/user-model";
import mongoose from "mongoose";
import path from "path";
import crypto from "crypto";

export const updateWallet = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.user;
    const { wallet } = req.body;

    // Validate input
    if (typeof wallet !== "number") {
      res.status(400).json({
        success: false,
        message: "wallet must be a number",
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
      return;
    }

    // Find and update user's wallet
    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const options = {
      amount: Math.round(wallet * 100),
      currency: "INR",
      receipt: "receipt_" + Math.random().toString(36).substring(7),
    };

    const order = await razorpayConfig.orders.create(options);

    res.status(200).json({
      success: true,
      message: "Wallet updated successfully",
      data: {
        order,
        prefill: {
          name: user.firstName + " " + user.lastName,
          email: user.email,
          contact: user.phone,
          countryCode: user.countryCode || "+91",
        }
      },
    });
  } catch (error) {
    console.error("Error updating wallet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update wallet",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const verifyPaymentWallet = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      wallet
    } = req.body;

    const userId = req.user.id;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !userId ||
      !wallet
    ) {
      res.status(400).json({
        success: false,
        message:
          "Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature, subscriptionId, userId",
      });
      return;
    }
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZ_KEY_SECRET || "")
      .update(sign.toString())
      .digest("hex");
    if (razorpay_signature === expectedSign) {
      // Payment is verified
      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      user.wallet = (user.wallet || 0) + wallet;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        data: user,
      });

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        data: {
          currentBalance: user.wallet,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const deductWallet = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.user;
    const { amount } = req.body;

    // Validate input
    if (typeof amount !== "number") {
      res.status(400).json({
        success: false,
        message: "amount must be a number",
      });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({
        success: false,
        message: "amount must be greater than 0",
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
      return;
    }

    // Find user
    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check if user has sufficient balance
    const currentBalance = user.wallet || 0;

    if (currentBalance < amount) {
      res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
        data: {
          currentBalance,
        },
      });
      return;
    }

    // Deduct amount from wallet
    user.wallet = currentBalance - amount;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Amount deducted from wallet successfully",
      data: {
        currentBalance: user.wallet,
      },
    });
  } catch (error) {
    console.error("Error deducting from wallet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deduct from wallet",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};