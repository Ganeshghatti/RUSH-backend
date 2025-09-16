"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const patientSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    password: { type: String, required: true },
    mapLocation: { type: String },
    insurance: {
        policyNumber: { type: String },
        provider: { type: String },
        image: { type: String },
    },
    subscriptions: [
        {
            startDate: { type: Date, required: true, default: Date.now },
            endDate: { type: Date },
            // paymentDetails: {
            //   upiId: { type: String },
            //   paymentImage: { type: String },
            // },
            SubscriptionId: {
                type: Schema.Types.ObjectId,
                ref: "PatientSubscription",
                required: true,
            },
            razorpay_order_id: { type: String },
            razorpay_payment_id: { type: String },
        },
    ],
    healthMetricsId: { type: Schema.Types.ObjectId, ref: "HealthMetrics" },
});
const Patient = mongoose_1.default.model("Patient", patientSchema);
exports.default = Patient;
