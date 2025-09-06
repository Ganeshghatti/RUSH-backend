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
            "Sister",
            "Brother",
            "Father-in-law",
            "Mother-in-law",
            "Other",
        ],
        required: true,
    },
    profilePic: { type: String },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
    },
    age: { type: Number },
    email: { type: String },
    address: {
        line1: { type: String },
        line2: { type: String },
        locality: { type: String },
        city: { type: String },
        pincode: { type: String },
        country: { type: String },
    },
    mobile: { type: String },
    idNumber: { type: String },
    idImage: { type: String },
    insurance: {
        policyNumber: { type: String },
        provider: { type: String },
        image: { type: String },
    },
    healthMetrics: {
        diabetes: Boolean,
        hypertension: Boolean,
        heartDisease: Boolean,
        stroke: Boolean,
        cancer: [String],
        thyroid: Boolean,
        mentalIllness: Boolean,
        geneticDisorders: Boolean,
        Other: String,
    },
});
const Family = mongoose_1.default.model("Family", familySchema);
exports.default = Family;
