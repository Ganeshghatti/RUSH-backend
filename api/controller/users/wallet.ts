import { Request, Response } from "express";
import User from "../../models/user/user-model";
import mongoose from "mongoose";

export const updateWallet = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.user;
      const { wallet } = req.body;
  
      // Validate input
      if (typeof wallet !== 'number') {
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
  
      // Update wallet amount
      user.wallet = (user.wallet || 0) + wallet;
      await user.save();
  
      res.status(200).json({
        success: true,
        message: "Wallet updated successfully",
        data: {
          currentBalance: user.wallet
        }
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

export const deductWallet = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.user;
      const { amount } = req.body;
  
      // Validate input
      if (typeof amount !== 'number') {
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
          }
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
          currentBalance: user.wallet
        }
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