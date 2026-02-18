"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const familySchema = new Schema({
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    relationship: {
        type: String,
        enum: [
            "Father",
            "Mother",
            "Child",
            "Spouse",
            "Sister",
            "Brother",
            "Father-in-law",
            "Mother-in-law",
            "Other",
        ],
        required: true,
    },
    basicDetails: {
        name: { type: String, required: true },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            required: true,
        },
        age: {
            type: Number,
            min: [0, "Age cannot be negative"],
            required: true,
        },
        email: { type: String },
        mobile: { type: String },
    },
    address: {
        line1: { type: String },
        line2: { type: String },
        locality: { type: String },
        city: { type: String },
        pincode: { type: String },
        country: { type: String },
    },
    idProof: {
        idType: String,
        idNumber: String,
        idImage: String, // store the key of image
    },
    insurance: [
        {
            policyNumber: { type: String },
            provider: { type: String },
            image: { type: String },
        },
    ],
    healthMetricsId: { type: Schema.Types.ObjectId, ref: "HealthMetrics" },
});
const Family = mongoose_1.default.model("Family", familySchema);
exports.default = Family;
