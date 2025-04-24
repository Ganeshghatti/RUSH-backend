"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const otpSchema = new Schema({
    phone: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300, // 300 seconds = 5 mins
    },
});
const OTP = mongoose_1.default.model("OTP", otpSchema);
exports.default = OTP;
