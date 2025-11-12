import { Request, Response } from "express";
import User from "../../models/user/user-model";
import mongoose from "mongoose";

// GET: List all pending debit requests
export const getPendingDebitRequests = async (req: Request, res: Response) => {
  try {
    // Find all users with at least one pending debit transaction
    const users = await User.find({
      transaction_history: {
        $elemMatch: { type: "debit", status: "pending" },
      },
    })
      .select("-password")
      .populate({
        path: "roleRefs.doctor",
        select: "-password"
      })
      .populate({
        path: "roleRefs.patient",
        select: "-password"
      })
      .populate({
        path: "roleRefs.admin",
        select: "-password"
      });

    // Flatten all pending debit transactions with user info and all roleRefs
    const pendingRequests: any[] = [];
    users.forEach((user) => {
      user.transaction_history.forEach((txn) => {
        if (txn.type === "debit" && txn.status === "pending") {
          pendingRequests.push({
            user: {
              ...user.toObject(),
              password: undefined, // extra safety
            },
            transaction: txn,
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      message: "Pending debit requests fetched successfully.",
      action: "getPendingDebitRequests:success",
      data: pendingRequests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "We couldn't load pending debit requests.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

// PUT: Process a pending debit request (approve or reject)
export const processDebitRequest = async (req: Request, res: Response) => {
  try {
    const { userId, transactionId, action, description , referenceId} = req.body;
    console.log("Request Body:", req.body);
    // action: "approve" or "reject"
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !transactionId ||
      !["approve", "reject"].includes(action)
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid user, transaction, and action.",
        action: "processDebitRequest:invalid-input",
      });
      return;
    }
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "We couldn't find that user.",
        action: "processDebitRequest:user-not-found",
      });
      return;
    }
    const txn = user.transaction_history.id(transactionId);
    if (!txn || txn.type !== "debit" || txn.status !== "pending") {
      res
        .status(404)
        .json({
          success: false,
          message: "We couldn't find that pending debit transaction.",
          action: "processDebitRequest:transaction-not-found",
        });
      return;
    }
    if (action === "approve") {
      // Deduct from wallet if sufficient balance
      if (user.wallet < txn.amount) {
        res.status(400).json({
          success: false,
          message: "Wallet balance is too low to approve this request.",
          action: "processDebitRequest:insufficient-balance",
        });
        return;
      }
      user.wallet -= txn.amount;
      txn.status = "completed";
    } else if (action === "reject") {
      txn.status = "failed";
    }
    // Always set description and referenceId if provided
    if (typeof description !== "undefined") txn.description = description;
    if (typeof referenceId !== "undefined") txn.referenceId = referenceId;
    // user.markModified("transaction_history");
    await user.save();
    res.status(200).json({
      success: true,
      message: `Debit request ${action}d successfully.`,
      action: `processDebitRequest:${action}`,
      data: {
        userId: user._id,
        transactionId: txn._id,
        status: txn.status,
        currentBalance: user.wallet,
        description: txn.description,
        referenceId: txn.referenceId
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "We couldn't process the debit request.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getTransactionsByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) {
      res.status(400).json({
        success: false,
        message: "The date query parameter (YYYY-MM-DD) is required.",
        action: "getTransactionsByDate:missing-date",
      });
      return;
    }

    // Parse date (assumed in IST) and convert to UTC day boundaries
    const dateString = date as string;
    const istStart = new Date(`${dateString}T00:00:00.000+05:30`);
    if (Number.isNaN(istStart.getTime())) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid date in YYYY-MM-DD format.",
        action: "getTransactionsByDate:invalid-date",
      });
      return;
    }
    const start = istStart;
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Find users with transactions on that date
    const users = await User.find({
      transaction_history: {
        $elemMatch: {
          date: { $gte: start, $lte: end }
        }
      }
    })
      .select("-password")
      .populate({
        path: "roleRefs.doctor",
        select: "-password"
      })
      .populate({
        path: "roleRefs.patient",
        select: "-password"
      })
      .populate({
        path: "roleRefs.admin",
        select: "-password"
      });

    // Flatten transactions for the date
    const transactions: any[] = [];
    users.forEach((user) => {
      user.transaction_history.forEach((txn) => {
        if (txn.date >= start && txn.date <= end) {
          transactions.push({
            user: {
              ...user.toObject(),
              password: undefined,
            },
            transaction: txn,
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      message: "Transactions fetched successfully for the date.",
      action: "getTransactionsByDate:success",
      data: transactions,
    });
    return;
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "We couldn't load transactions for that date.",
      action: error instanceof Error ? error.message : String(error),
    });
    return;
  }
};