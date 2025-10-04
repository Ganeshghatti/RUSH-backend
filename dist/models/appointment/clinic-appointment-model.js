"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const clinicAppointmentSchema = new Schema({
    doctorId: {
        type: Schema.Types.ObjectId,
        ref: "Doctor",
        required: true,
    },
    patientId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    clinicId: {
        type: String,
        required: true,
    },
    slot: {
        day: {
            type: Date,
            required: true,
        },
        duration: {
            type: Number,
            required: true,
            enum: [15, 30, 45, 60],
        },
        time: {
            start: {
                type: Date,
                required: true,
            },
            end: {
                type: Date,
                required: true,
            },
        },
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "completed", "cancelled", "expired"],
        default: "pending",
    },
    otp: {
        code: { type: String },
        generatedAt: { type: Date },
        expiresAt: { type: Date },
        attempts: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 3 },
        isUsed: { type: Boolean, default: false },
    },
    paymentDetails: {
        amount: { type: Number, required: true },
        patientWalletDeducted: { type: Number, required: true },
        patientWalletFrozen: { type: Number, required: true },
        paymentStatus: {
            type: String,
            enum: ["pending", "frozen", "completed", "failed"],
            default: "pending",
        },
    },
}, {
    timestamps: true,
});
// Index for efficient queries
clinicAppointmentSchema.index({ doctorId: 1, "slot.day": 1 });
clinicAppointmentSchema.index({ patientId: 1, "slot.day": 1 });
clinicAppointmentSchema.index({ status: 1 });
const ClinicAppointment = mongoose_1.default.model("ClinicAppointment", clinicAppointmentSchema);
exports.default = ClinicAppointment;
