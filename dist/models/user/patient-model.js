"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("./user-model"));
const { Schema } = mongoose_1.default;
const patientSchema = new Schema({
    mapLocation: { type: String },
    insurance: {
        policyNumber: { type: String },
        provider: { type: String },
        image: { type: String },
    },
    healthMetrics: [
        {
            bloodPressure: { type: String }, // e.g., "120/80"
            bloodGlucose: { type: Number }, // Average blood glucose level
            weight: { type: Number }, // in kg
            height: { type: Number }, // in cm
            bloodGroup: {
                type: String,
                enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
            },
            conditions: [{ type: String }],
            date: { type: Date, default: Date.now }, // Date when metrics were recorded
        },
    ],
});
const Patient = user_model_1.default.discriminator("patient", patientSchema);
exports.default = Patient;
