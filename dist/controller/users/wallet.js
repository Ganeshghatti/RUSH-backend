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
exports.deductWallet = exports.verifyPaymentWallet = exports.updateWallet = void 0;
const razorpay_1 = require("./../../config/razorpay");
const razorpayX_1 = require("../../config/razorpayX");
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const mongoose_1 = __importDefault(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
const updateWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID format",
            });
            return;
        }
        // Find and update user's wallet
        const user = yield user_model_1.default.findById(id);
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
        const order = yield razorpay_1.razorpayConfig.orders.create(options);
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
    }
    catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update wallet",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.updateWallet = updateWallet;
const verifyPaymentWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, wallet, } = req.body;
        const userId = req.user.id;
        if (!razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature ||
            !userId ||
            !wallet) {
            res.status(400).json({
                success: false,
                message: "Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature, subscriptionId, userId",
            });
            return;
        }
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto_1.default
            .createHmac("sha256", process.env.RAZ_KEY_SECRET || "")
            .update(sign.toString())
            .digest("hex");
        if (razorpay_signature === expectedSign) {
            // Payment is verified
            const user = yield user_model_1.default.findById(userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: "User not found",
                });
                return;
            }
            user.wallet = (user.wallet || 0) + wallet;
            yield user.save();
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
        }
        else {
            res.status(400).json({
                success: false,
                message: "Invalid payment signature",
            });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.verifyPaymentWallet = verifyPaymentWallet;
// controller to derduct.
const deductWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID format",
            });
            return;
        }
        // Find user from DB
        const user = yield user_model_1.default.findById(id);
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
        // step 1 - Check if RazorPay contact_id exists
        if (!user.rzpayContactId) {
            const contact = yield razorpayX_1.razorpayAxios.post("/contacts", {
                name: user.firstName + " " + user.lastName,
                email: user.email,
                contact: user.phone,
                type: "user"
            });
            user.rzpayContactId = contact.data.id;
            yield user.save();
        }
        // step 2 - Check if Razorpay Fund accountid
        if (!user.rzpayFundAccountId) {
            if (!user.bankDetails || !user.bankDetails.accountNumber || !user.bankDetails.ifscCode ||
                !user.bankDetails.accountName) {
                res.status(400).json({
                    success: false,
                    message: "Bank details are missing. Please update your bank details before withdrawing.",
                });
                return;
            }
            const fundRes = yield razorpayX_1.razorpayAxios.post("/fund_accounts", {
                contact_id: user.rzpayContactId,
                account_type: "bank_account",
                bank_account: {
                    name: user.bankDetails.accountName,
                    ifsc: user.bankDetails.ifscCode,
                    account_number: user.bankDetails.accountNumber,
                },
            });
            user.rzpayFundAccountId = fundRes.data.id;
            yield user.save();
        }
        // step 3 - Initiate Payout
        const payoutRes = yield razorpayX_1.razorpayAxios.post("/payouts", {
            account_number: process.env.RAZORPAYX_VIRTUAL_ACC,
            fund_account_id: user.rzpayFundAccountId,
            amount: amount * 100,
            currency: "INR",
            mode: "IMPS",
            purpose: "payout",
            queue_if_low_balance: true,
            reference_id: `wd_${user._id}_${Date.now()}`,
            narration: "Wallet Withdrawal",
        });
        // we have to setup web hook because inital response of razorpay will be initated.
        // Deduct amount from wallet
        // user.wallet = currentBalance - amount;
        // await user.save();
        // res.status(200).json({
        //   success: true,
        //   message: "Amount deducted from wallet successfully",
        //   data: {
        //     currentBalance: user.wallet,
        //   },
        // });
    }
    catch (error) {
        console.error("Error deducting from wallet:", error);
        res.status(500).json({
            success: false,
            message: "Failed to deduct from wallet",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.deductWallet = deductWallet;
