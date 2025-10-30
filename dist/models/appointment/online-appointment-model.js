"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const onlineAppointmentSchema = new Schema({
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
    slot: {
        day: {
            type: Date,
            required: true,
        },
        duration: {
            type: Number,
            required: true,
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
    history: {
        title: {
            type: String,
        },
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "completed", "expired"],
        default: "pending",
    },
    roomName: { type: String },
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
    prescriptionId: { type: Schema.Types.ObjectId, ref: "Prescription" },
    ratingId: { type: Schema.Types.ObjectId, ref: "RatingModel" }
});
const OnlineAppointment = mongoose_1.default.model("OnlineAppointment", onlineAppointmentSchema);
exports.default = OnlineAppointment;
