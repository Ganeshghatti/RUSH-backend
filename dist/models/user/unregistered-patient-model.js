"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const unregisteredPatientSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
    },
    gender: {
        type: String,
        trim: true,
        default: null,
    },
    age: {
        type: Number,
        default: null
    },
    // Location details
    address: {
        type: String,
        trim: true,
        default: null,
    },
    locality: {
        type: String,
        trim: true,
        default: null,
    },
    pincode: {
        type: String,
        trim: true,
        default: null,
    },
    city: {
        type: String,
        trim: true,
        default: null,
    },
    state: {
        type: String,
        trim: true,
        default: null,
    },
    country: {
        type: String,
        trim: true,
        default: "India",
    },
    disease: {
        type: String,
        default: null,
    },
}, { timestamps: true });
const UnregisteredPatient = mongoose_1.default.model("UnregisteredPatient", unregisteredPatientSchema);
exports.default = UnregisteredPatient;
