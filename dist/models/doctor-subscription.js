"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const DoctorSubscriptionSchema = new mongoose_1.Schema({
    price: {
        type: Number,
        required: [true, "Subscription price is required"],
    },
    name: {
        type: String,
        required: [true, "Subscription name is required"],
    },
    description: {
        type: String,
        required: [true, "Subscription description is required"],
    },
    qrCodeImage: {
        type: String,
        required: [true, "QR code image is required for subscription"],
    },
    features: [
        {
            type: String,
        },
    ],
    isActive: {
        type: Boolean,
        default: true,
    },
    duration: {
        type: String,
        required: [true, "Subscription duration is required"],
        enum: [
            "1 month",
            "3 months",
            "1 year",
            "2 years",
            "20 years",
            "15 years",
            "10 years",
            "5 years",
            "40 years",
            "lifetime",
        ],
    },
    platformFeeOnline: {
        type: Number,
        min: [0, "Platform fee must be a positive number"],
    },
    opsExpenseOnline: {
        type: Number,
        min: [0, "Operational expense must be at least 0%"],
        max: [100, "Operational expense cannot exceed 100%"],
    },
    platformFeeClinic: {
        type: Number,
        min: [0, "Platform fee must be a positive number"],
    },
    opsExpenseClinic: {
        type: Number,
        min: [0, "Operational expense must be at least 0%"],
        max: [100, "Operational expense cannot exceed 100%"],
    },
    platformFeeHomeVisit: {
        type: Number,
        min: [0, "Platform fee must be a positive number"],
    },
    opsExpenseHomeVisit: {
        type: Number,
        min: [0, "Operational expense must be at least 0%"],
        max: [100, "Operational expense cannot exceed 100%"],
    },
    platformFeeEmergency: {
        type: Number,
        min: [0, "Platform fee must be a positive number"],
    },
    opsExpenseEmergency: {
        type: Number,
        min: [0, "Operational expense must be at least 0%"],
        max: [100, "Operational expense cannot exceed 100%"],
    },
}, {
    timestamps: true,
});
const DoctorSubscription = mongoose_1.default.model("DoctorSubscription", DoctorSubscriptionSchema);
exports.default = DoctorSubscription;
