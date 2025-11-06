import { razorpayConfig } from "./../../config/razorpay";
import { razorpayAxios } from "../../config/razorpayX";
import { Request, Response } from "express";
import User from "../../models/user/user-model";
import mongoose from "mongoose";
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
        message: "Wallet amount must be a number.",
        action: "updateWallet:validate-wallet-type",
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID provided.",
        action: "updateWallet:validate-user-id",
      });
      return;
    }

    // Find and update user's wallet
    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your account.",
        action: "updateWallet:user-not-found",
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
      message: "Payment order created successfully.",
      action: "updateWallet:order-created",
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
      message: "We couldn't create the payment order.",
      action: error instanceof Error ? error.message : String(error),
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
          "Please provide all payment details (order, payment, signature, wallet).",
        action: "verifyPaymentWallet:validate-input",
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
          message: "We couldn't find your account.",
          action: "verifyPaymentWallet:user-not-found",
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

      res.status(200).json({
        success: true,
        message: "Payment verified successfully.",
        action: "verifyPaymentWallet:success",
        data: {
          currentBalance: user.wallet,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: "The payment signature did not match.",
        action: "verifyPaymentWallet:signature-mismatch",
      });
    }
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "We couldn't verify the payment.",
      action: (err as Error).message,
    });
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
        message: "Amount must be a number.",
        action: "deductWallet:validate-amount-type",
      });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({
        success: false,
        message: "Amount must be greater than zero.",
        action: "deductWallet:validate-amount-positive",
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID provided.",
        action: "deductWallet:validate-user-id",
      });
      return;
    }

    // Find user from DB
    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your account.",
        action: "deductWallet:user-not-found",
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
          "You already have a debit request in progress. Please wait for it to finish.",
        action: "deductWallet:pending-debit",
      });
      return;
    }

    // Check if user has sufficient balance
    const currentBalance = user.wallet || 0;
    if (currentBalance < amount) {
      res.status(400).json({
        success: false,
        message: "Your wallet balance is too low for this withdrawal.",
        action: "deductWallet:insufficient-balance",
        data: {
          currentBalance,
        },
      });
      return;
    }

    if (!bankDetails) {
      res.status(400).json({
        success: false,
        message: "Bank or UPI details are required to process a debit.",
        action: "deductWallet:missing-bank-details",
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
          "Share a valid UPI ID or complete bank account details (accountNumber, ifscCode, bankName, accountName).",
        action: "deductWallet:invalid-bank-details",
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

    res.status(200).json({
      success: true,
      message: "Debit request submitted. Our team will review it soon.",
      action: "deductWallet:debit-request-created",
      data: {
        currentBalance: user.wallet,
      },
    });
  } catch (error) {
    console.error("Error deducting from wallet:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't create the debit request.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};
