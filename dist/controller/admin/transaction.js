"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactionsByDate = exports.processDebitRequest = exports.getPendingDebitRequests = void 0;
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const mongoose_1 = __importDefault(require("mongoose"));
const transaction_notifications_1 = require("../../utils/mail/transaction_notifications");
// GET: List all pending debit requests
const getPendingDebitRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find all users with at least one pending debit transaction
        const users = yield user_model_1.default.find({
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
        const pendingRequests = [];
        users.forEach((user) => {
            user.transaction_history.forEach((txn) => {
                if (txn.type === "debit" && txn.status === "pending") {
                    pendingRequests.push({
                        user: Object.assign(Object.assign({}, user.toObject()), { password: undefined }),
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "We couldn't load pending debit requests.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getPendingDebitRequests = getPendingDebitRequests;
// PUT: Process a pending debit request (approve or reject)
const processDebitRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, transactionId, action, description, referenceId } = req.body;
        console.log("Request Body:", req.body);
        // action: "approve" or "reject"
        if (!mongoose_1.default.Types.ObjectId.isValid(userId) ||
            !transactionId ||
            !["approve", "reject"].includes(action)) {
            res.status(400).json({
                success: false,
                message: "Please provide a valid user, transaction, and action.",
                action: "processDebitRequest:invalid-input",
            });
            return;
        }
        const user = yield user_model_1.default.findById(userId);
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
        }
        else if (action === "reject") {
            txn.status = "failed";
        }
        // Always set description and referenceId if provided
        if (typeof description !== "undefined")
            txn.description = description;
        if (typeof referenceId !== "undefined")
            txn.referenceId = referenceId;
        // user.markModified("transaction_history");
        yield user.save();
        console.log(`Sending debit status update for transaction: ${txn._id}`);
        yield (0, transaction_notifications_1.sendDebitStatusUpdateMail)({
            userName: user.firstName,
            email: user.email,
            transactionId: txn._id.toString(),
            status: txn.status,
            amount: txn.amount.toString(),
            reason: description,
        });
        console.log(`Debit status update notification sent for transaction: ${txn._id}`);
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "We couldn't process the debit request.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.processDebitRequest = processDebitRequest;
const getTransactionsByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const dateString = date;
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
        const users = yield user_model_1.default.find({
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
        const transactions = [];
        users.forEach((user) => {
            user.transaction_history.forEach((txn) => {
                if (txn.date >= start && txn.date <= end) {
                    transactions.push({
                        user: Object.assign(Object.assign({}, user.toObject()), { password: undefined }),
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "We couldn't load transactions for that date.",
            action: error instanceof Error ? error.message : String(error),
        });
        return;
    }
});
exports.getTransactionsByDate = getTransactionsByDate;
