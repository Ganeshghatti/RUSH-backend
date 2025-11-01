import { razorpayConfig } from "./../../config/razorpay";
import { razorpayAxios } from "../../config/razorpayX";
import { Request, Response } from "express";
import User from "../../models/user/user-model";
import mongoose from "mongoose";
import crypto from "crypto";
import {
  sendCreditCompletedMail,
  sendNewDebitRequestMail,
  sendTransactionFailedMail,
} from "../../utils/mail/transaction_notifications";

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

    const transaction = {
      type: "credit",
      orderId: order.id,
      status: "pending",
      amount: wallet,
      date: Date.now(),
    };
    user.transaction_history.push(transaction);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Order created successfully",
      data: {
        order,
        prefill: {
          name: user.firstName + " " + user.lastName,
          email: user.email,
          contact: user.phone,
          countryCode: user.countryCode || "+91",
        },
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update wallet",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const verifyPaymentWallet = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      wallet,
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

      user.wallet = user.wallet + wallet;
      const transactionIndex = user.transaction_history.findIndex(
        (t) => t.orderId === razorpay_order_id
      );
      if (transactionIndex !== -1) {
        user.transaction_history[transactionIndex].status = "completed";
        user.transaction_history[transactionIndex].referenceId =
          razorpay_payment_id;
      }
      await user.save();

      // Send credit completed email
      await sendCreditCompletedMail({
        userName: user.firstName,
        email: user.email,
        transactionId: razorpay_payment_id,
        amount: wallet.toString(),
      });

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        data: {
          currentBalance: user.wallet,
        },
      });
    } else {
      // Find user to send failure notification
      const user = await User.findById(userId);
      if (user) {
        const transactionIndex = user.transaction_history.findIndex(
          (t) => t.orderId === razorpay_order_id
        );
        if (transactionIndex !== -1) {
          user.transaction_history[transactionIndex].status = "failed";
          await user.save();
        }
        await sendTransactionFailedMail({
          userName: user.firstName,
          email: user.email,
          transactionId: razorpay_order_id,
          amount: wallet.toString(),
          reason: "Invalid payment signature",
        });
      }
      res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// controller to derduct.
export const deductWallet = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.user;
    const { amount, bankDetails } = req.body;

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

    // Find user from DB
    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check for existing pending debit transaction
    const hasPendingDebit = user.transaction_history.some(
      (t) => t.type === "debit" && t.status === "pending"
    );
    if (hasPendingDebit) {
      res.status(400).json({
        success: false,
        message:
          "A pending debit transaction already exists. Please wait for it to be processed.",
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

    if (!bankDetails) {
      res.status(400).json({
        success: false,
        message: "bankDetails are required for debit request",
      });
      return;
    }
    // Validate: at least UPI or all required bank fields must be present
    const hasUpi = typeof bankDetails.upiId === "string" && bankDetails.upiId.trim() !== "";
    const hasBank = [
      bankDetails.accountNumber,
      bankDetails.ifscCode,
      bankDetails.bankName,
      bankDetails.accountName,
    ].every((v) => typeof v === "string" && v.trim() !== "");
    if (!hasUpi && !hasBank) {
      res.status(400).json({
        success: false,
        message:
          "Provide at least a valid UPI ID or all required bank account details (accountNumber, ifscCode, bankName, accountName)",
      });
      return;
    }
    // Store both if provided, or only the one(s) present
    const bankDetailsSnapshot: any = {};
    if (hasUpi) bankDetailsSnapshot.upiId = bankDetails.upiId;
    if (hasBank) {
      bankDetailsSnapshot.accountNumber = bankDetails.accountNumber;
      bankDetailsSnapshot.ifscCode = bankDetails.ifscCode;
      bankDetailsSnapshot.bankName = bankDetails.bankName;
      bankDetailsSnapshot.accountName = bankDetails.accountName;
    }
    const transaction = {
      type: "debit",
      amount: amount,
      status: "pending",
      date: Date.now(),
      bankDetailsSnapshot,
    };
    user.transaction_history.push(transaction);

    await user.save();

    // Send new debit request email to admin
    const newTransaction = user.transaction_history[user.transaction_history.length - 1];
    await sendNewDebitRequestMail({
      userName: user.firstName,
      email: user.email, // Required by interface, but will be sent to admin
      transactionId: newTransaction._id.toString(),
      amount: amount.toString(),
    });

    res.status(200).json({
      success: true,
      message: "Debit request created. Awaiting admin approval.",
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
