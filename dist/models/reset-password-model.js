"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const resetPasswordSchema = new Schema({
    email: { type: String, required: true },
    role: { type: String, required: true },
    token: { type: String, required: true },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600, // 10 minutes
    },
});
const ResetPassword = mongoose_1.default.model("ResetPassword", resetPasswordSchema);
exports.default = ResetPassword;
