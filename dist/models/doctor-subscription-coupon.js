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
const DoctorSubscriptionCouponSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: [true, "Coupon code is required"],
        unique: true,
        trim: true,
        uppercase: true,
    },
    discountPercent: {
        type: Number,
        required: [true, "Discount percentage is required"],
        min: [1, "Discount must be at least 1%"],
        max: [100, "Discount cannot exceed 100%"],
    },
    description: {
        type: String,
        default: "",
    },
    /** Empty = applicable to all doctor subscription plans; otherwise only these IDs */
    applicableSubscriptionIds: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "DoctorSubscription",
        },
    ],
    isActive: {
        type: Boolean,
        default: true,
    },
    validFrom: {
        type: Date,
        default: null,
    },
    validUntil: {
        type: Date,
        default: null,
    },
    maxUses: {
        type: Number,
        default: null,
    },
    usedCount: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });
const DoctorSubscriptionCoupon = mongoose_1.default.model("DoctorSubscriptionCoupon", DoctorSubscriptionCouponSchema);
exports.default = DoctorSubscriptionCoupon;
