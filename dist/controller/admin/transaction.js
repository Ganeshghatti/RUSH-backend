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
exports.processDebitRequest = exports.getPendingDebitRequests = void 0;
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const mongoose_1 = __importDefault(require("mongoose"));
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
            data: pendingRequests,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch pending debit requests",
            error: error instanceof Error ? error.message : String(error),
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
                message: "Invalid userId, transactionId, or action",
            });
            return;
        }
        const user = yield user_model_1.default.findById(userId);
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to process debit request",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.processDebitRequest = processDebitRequest;
