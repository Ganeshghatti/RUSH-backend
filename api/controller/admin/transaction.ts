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
      data: pendingRequests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending debit requests",
      error: error instanceof Error ? error.message : String(error),
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
        message: "Invalid userId, transactionId, or action",
      });
      return;
    }
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    const txn = user.transaction_history.id(transactionId);
    if (!txn || txn.type !== "debit" || txn.status !== "pending") {
      res
        .status(404)
        .json({
          success: false,
          message: "Pending debit transaction not found",
        });
      return;
    }
    if (action === "approve") {
      // Deduct from wallet if sufficient balance
      if (user.wallet < txn.amount) {
        res.status(400).json({
          success: false,
          message: "Insufficient wallet balance to approve this request",
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
      message: `Debit request ${action}d successfully`,
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
      message: "Failed to process debit request",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getTransactionsByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) {
      res.status(400).json({
        success: false,
        message: "Date query parameter is required (YYYY-MM-DD)",
      });
      return;
    }

    // Parse date and get start/end of day
    const start = new Date(date as string);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

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
      data: transactions,
    });
    return;
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch transactions for date",
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }
};