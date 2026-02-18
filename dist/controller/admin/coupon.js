"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCoupon = exports.updateCoupon = exports.createCoupon = exports.getCoupons = void 0;
const doctor_subscription_coupon_1 = __importDefault(require("../../models/doctor-subscription-coupon"));
const getCoupons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coupons = yield doctor_subscription_coupon_1.default.find()
            .populate("applicableSubscriptionIds", "name duration price")
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            message: "Coupons fetched successfully.",
            data: coupons,
        });
    }
    catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load coupons.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getCoupons = getCoupons;
const createCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code, discountPercent, description, applicableSubscriptionIds, isActive, validFrom, validUntil, maxUses, } = req.body;
        if (!code || discountPercent == null) {
            res.status(400).json({
                success: false,
                message: "Code and discount percent are required.",
                action: "createCoupon:validation",
            });
            return;
        }
        const normalizedCode = String(code).trim().toUpperCase();
        const existing = yield doctor_subscription_coupon_1.default.findOne({
            code: normalizedCode,
        });
        if (existing) {
            res.status(400).json({
                success: false,
                message: "A coupon with this code already exists.",
                action: "createCoupon:duplicate",
            });
            return;
        }
        const coupon = yield doctor_subscription_coupon_1.default.create({
            code: normalizedCode,
            discountPercent: Number(discountPercent),
            description: description !== null && description !== void 0 ? description : "",
            applicableSubscriptionIds: Array.isArray(applicableSubscriptionIds)
                ? applicableSubscriptionIds
                : [],
            isActive: isActive !== false,
            validFrom: validFrom ? new Date(validFrom) : null,
            validUntil: validUntil ? new Date(validUntil) : null,
            maxUses: maxUses != null ? Number(maxUses) : null,
        });
        res.status(201).json({
            success: true,
            message: "Coupon created successfully.",
            data: coupon,
        });
    }
    catch (error) {
        console.error("Error creating coupon:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't create the coupon.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.createCoupon = createCoupon;
const updateCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { code, discountPercent, description, applicableSubscriptionIds, isActive, validFrom, validUntil, maxUses, } = req.body;
        const coupon = yield doctor_subscription_coupon_1.default.findById(id);
        if (!coupon) {
            res.status(404).json({
                success: false,
                message: "Coupon not found.",
                action: "updateCoupon:not-found",
            });
            return;
        }
        if (code != null) {
            const normalizedCode = String(code).trim().toUpperCase();
            const existing = yield doctor_subscription_coupon_1.default.findOne({
                code: normalizedCode,
                _id: { $ne: id },
            });
            if (existing) {
                res.status(400).json({
                    success: false,
                    message: "Another coupon with this code already exists.",
                    action: "updateCoupon:duplicate",
                });
                return;
            }
            coupon.code = normalizedCode;
        }
        if (discountPercent != null)
            coupon.discountPercent = Number(discountPercent);
        if (description != null)
            coupon.description = description;
        if (Array.isArray(applicableSubscriptionIds))
            coupon.applicableSubscriptionIds = applicableSubscriptionIds;
        if (typeof isActive === "boolean")
            coupon.isActive = isActive;
        if (validFrom != null)
            coupon.validFrom = validFrom ? new Date(validFrom) : null;
        if (validUntil != null)
            coupon.validUntil = validUntil ? new Date(validUntil) : null;
        if (maxUses != null)
            coupon.maxUses = maxUses === "" ? null : Number(maxUses);
        yield coupon.save();
        res.status(200).json({
            success: true,
            message: "Coupon updated successfully.",
            data: coupon,
        });
    }
    catch (error) {
        console.error("Error updating coupon:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't update the coupon.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.updateCoupon = updateCoupon;
const deleteCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const coupon = yield doctor_subscription_coupon_1.default.findByIdAndDelete(id);
        if (!coupon) {
            res.status(404).json({
                success: false,
                message: "Coupon not found.",
                action: "deleteCoupon:not-found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Coupon deleted successfully.",
        });
    }
    catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't delete the coupon.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.deleteCoupon = deleteCoupon;
