"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const emergencyAppointmentSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    patientId: {
        type: Schema.Types.ObjectId,
        ref: "Patient",
        required: true,
    },
    doctorId: {
        type: Schema.Types.ObjectId,
        ref: "Doctor",
    },
    media: [
        {
            type: String, // URL or file path for media
        },
    ],
    location: {
        type: String,
        required: true,
        trim: true,
    },
    contactNumber: {
        type: String,
        trim: true,
    },
    name: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ["pending", "in-progress", "completed", "expired"],
        default: "pending",
    },
    roomName: {
        type: String,
        trim: true,
    },
    paymentDetails: {
        amount: { type: Number, required: true },
        patientWalletDeducted: { type: Number, required: true },
        patientWalletFrozen: { type: Number, required: true },
        paymentStatus: {
            type: String,
            enum: ["pending", "completed"],
            default: "pending",
        },
    },
}, {
    timestamps: true, // Automatically manages createdAt and updatedAt
});
const EmergencyAppointment = mongoose_1.default.model("EmergencyAppointment", emergencyAppointmentSchema);
exports.default = EmergencyAppointment;
