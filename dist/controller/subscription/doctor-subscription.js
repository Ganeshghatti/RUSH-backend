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
exports.deleteSubscription = exports.getActiveSubscriptions = exports.getSubscriptions = exports.updateSubscription = exports.createSubscription = void 0;
const doctor_subscription_1 = __importDefault(require("../../models/doctor-subscription"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const upload_media_1 = require("../../utils/aws_s3/upload-media");
const qrcode_1 = __importDefault(require("qrcode"));
const signed_url_1 = require("../../utils/signed-url");
// Validate online fee object (min15, min30, min60)
function validateOnlineFee(fee, label) {
    var _a, _b;
    const slots = ["min15", "min30", "min60"];
    for (const slot of slots) {
        if (!fee ||
            typeof fee[slot] !== "object" ||
            !["Number", "Percentage"].includes((_a = fee[slot]) === null || _a === void 0 ? void 0 : _a.type) ||
            typeof ((_b = fee[slot]) === null || _b === void 0 ? void 0 : _b.figure) !== "number" ||
            fee[slot].figure < 0) {
            return `${label}.${slot} must be an object with type ('Number' or 'Percentage') and a non-negative figure`;
        }
    }
    return null;
}
const createSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { price, name, description, features, isActive, duration, platformFeeOnline, opsExpenseOnline, platformFeeClinic, opsExpenseClinic, platformFeeEmergency, opsExpenseEmergency, platformFeeHomeVisit, opsExpenseHomeVisit, doctor_type, doctor_type_description, no_of_clinics, advertisement_cost, is_premium, } = req.body;
        if (price < 0) {
            res.status(400).json({
                success: false,
                message: "Price must be zero or higher.",
                action: "createDoctorSubscription:invalid-price",
            });
            return;
        }
        // Validate platformFeeOnline and opsExpenseOnline (min15, min30, min60)
        const pfOnlineErr = validateOnlineFee(platformFeeOnline, "platformFeeOnline");
        const oeOnlineErr = validateOnlineFee(opsExpenseOnline, "opsExpenseOnline");
        if (pfOnlineErr || oeOnlineErr) {
            res.status(400).json({
                success: false,
                message: "Please review the online fee settings.",
                action: `createDoctorSubscription:${pfOnlineErr ? "platform-fee-error" : "ops-fee-error"}`,
                data: {
                    details: pfOnlineErr || oeOnlineErr,
                },
            });
            return;
        }
        // Validate other fee objects (clinic, homevisit, emergency)
        const feeFields = [
            platformFeeClinic,
            opsExpenseClinic,
            platformFeeHomeVisit,
            opsExpenseHomeVisit,
            platformFeeEmergency,
            opsExpenseEmergency,
        ];
        for (const fee of feeFields) {
            if (!fee ||
                typeof fee !== "object" ||
                !["Number", "Percentage"].includes(fee.type) ||
                typeof fee.figure !== "number" ||
                fee.figure < 0) {
                res.status(400).json({
                    success: false,
                    message: "Please review the clinic, home visit, and emergency fee settings.",
                    action: `createDoctorSubscription:invalid-fee-${feeFields.indexOf(fee)}`,
                });
                return;
            }
        }
        // Validate required fields
        if (!name || !description || !duration) {
            res.status(400).json({
                success: false,
                message: "Price, name, description, and duration are required to create a subscription.",
                action: "createDoctorSubscription:missing-required-fields",
            });
            return;
        }
        const upiLink = `upi://pay?pa=yespay.bizsbiz81637@yesbankltd&pn=RUSHDR&am=${parseFloat(price).toFixed(2)}&cu=INR`;
        const qrCodeDataUrl = yield qrcode_1.default.toDataURL(upiLink);
        // Convert Data URL to Buffer
        const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
        const qrBuffer = Buffer.from(base64Data, "base64");
        // Upload QR code to S3
        const timestamp = Date.now();
        const s3Key = `qr-codes/subscription-${timestamp}.png`;
        const signedUrl = yield (0, upload_media_1.UploadImgToS3)({
            key: s3Key,
            fileBuffer: qrBuffer,
            fileName: `subscription-${timestamp}.png`,
        });
        const subscription = yield doctor_subscription_1.default.create({
            price: parseFloat(price).toFixed(2),
            name,
            description,
            features: features || [],
            isActive: isActive,
            is_premium: Boolean(is_premium),
            duration,
            // qrCodeImage: signedUrl,
            doctor_type,
            doctor_type_description,
            no_of_clinics: typeof no_of_clinics === "number" ? no_of_clinics : 0,
            advertisement_cost: typeof advertisement_cost === "number" ? advertisement_cost : 0,
            platformFeeOnline,
            opsExpenseOnline,
            platformFeeClinic,
            opsExpenseClinic,
            platformFeeHomeVisit,
            opsExpenseHomeVisit,
            platformFeeEmergency,
            opsExpenseEmergency,
        });
        res.status(201).json({
            success: true,
            message: "Subscription created successfully.",
            action: "createDoctorSubscription:success",
            data: subscription,
        });
    }
    catch (error) {
        console.error("Error creating subscription:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't create the subscription.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.createSubscription = createSubscription;
const updateSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { isActive, is_premium, name, description, features, price, platformFeeOnline, opsExpenseOnline, platformFeeClinic, opsExpenseClinic, platformFeeHomeVisit, opsExpenseHomeVisit, platformFeeEmergency, opsExpenseEmergency, no_of_clinics, advertisement_cost, } = req.body;
        // Build update object with only provided fields
        const updateData = {};
        // Validate and add no_of_clinics if provided
        if (no_of_clinics !== undefined) {
            if (typeof no_of_clinics !== "number" || no_of_clinics < 0) {
                res.status(400).json({
                    success: false,
                    message: "Number of clinics must be zero or higher.",
                    action: "updateDoctorSubscription:invalid-clinic-count",
                });
                return;
            }
            updateData.no_of_clinics = no_of_clinics;
        }
        // Validate and add advertisement_cost if provided
        if (advertisement_cost !== undefined) {
            if (typeof advertisement_cost !== "number" || advertisement_cost < 0) {
                res.status(400).json({
                    success: false,
                    message: "Advertisement cost must be zero or higher.",
                    action: "updateDoctorSubscription:invalid-advertisement-cost",
                });
                return;
            }
            updateData.advertisement_cost = advertisement_cost;
        }
        // Validate and add isActive if provided
        if (isActive !== undefined) {
            if (typeof isActive !== "boolean") {
                res.status(400).json({
                    success: false,
                    message: "isActive must be true or false.",
                    action: "updateDoctorSubscription:invalid-isActive",
                });
                return;
            }
            updateData.isActive = isActive;
        }
        // Validate and add is_premium if provided
        if (is_premium !== undefined) {
            if (typeof is_premium !== "boolean") {
                res.status(400).json({
                    success: false,
                    message: "is_premium must be true or false.",
                    action: "updateDoctorSubscription:invalid-is_premium",
                });
                return;
            }
            updateData.is_premium = is_premium;
        }
        // Validate and add name if provided
        if (name !== undefined) {
            if (typeof name !== "string" || name.trim() === "") {
                res.status(400).json({
                    success: false,
                    message: "Name must be a non-empty string.",
                    action: "updateDoctorSubscription:invalid-name",
                });
                return;
            }
            updateData.name = name.trim();
        }
        // Validate and add description if provided
        if (description !== undefined) {
            if (typeof description !== "string" || description.trim() === "") {
                res.status(400).json({
                    success: false,
                    message: "Description must be a non-empty string.",
                    action: "updateDoctorSubscription:invalid-description",
                });
                return;
            }
            updateData.description = description.trim();
        }
        // Validate and add features if provided
        if (features !== undefined) {
            if (!Array.isArray(features)) {
                res.status(400).json({
                    success: false,
                    message: "Features must be provided as a list.",
                    action: "updateDoctorSubscription:invalid-features-type",
                });
                return;
            }
            // Validate each feature is a string
            for (const feature of features) {
                if (typeof feature !== "string" || feature.trim() === "") {
                    res.status(400).json({
                        success: false,
                        message: "Each feature must be a non-empty string.",
                        action: "updateDoctorSubscription:invalid-feature-entry",
                    });
                    return;
                }
            }
            updateData.features = features.map((feature) => feature.trim());
        }
        // Validate and add fee fields if provided
        const feeUpdateFields = [
            "platformFeeOnline",
            "opsExpenseOnline",
            "platformFeeClinic",
            "opsExpenseClinic",
            "platformFeeHomeVisit",
            "opsExpenseHomeVisit",
            "platformFeeEmergency",
            "opsExpenseEmergency",
        ];
        for (const field of feeUpdateFields) {
            if (req.body[field] !== undefined) {
                if (field === "platformFeeOnline" || field === "opsExpenseOnline") {
                    const err = validateOnlineFee(req.body[field], field);
                    if (err) {
                        res.status(400).json({
                            success: false,
                            message: "Please review the online fee settings.",
                            action: `updateDoctorSubscription:${field}-error`,
                            data: {
                                details: err,
                            },
                        });
                        return;
                    }
                    updateData[field] = req.body[field];
                }
                else {
                    const fee = req.body[field];
                    if (!fee ||
                        typeof fee !== "object" ||
                        !["Number", "Percentage"].includes(fee.type) ||
                        typeof fee.figure !== "number" ||
                        fee.figure < 0) {
                        res.status(400).json({
                            success: false,
                            message: "Please review the fee settings for clinic, home visit, or emergency.",
                            action: `updateDoctorSubscription:invalid-fee-${field}`,
                        });
                        return;
                    }
                    updateData[field] = fee;
                }
            }
        }
        // validate and add price if provided
        if (price !== undefined) {
            if (typeof price !== "number") {
                res.status(400).json({
                    success: false,
                    message: "Price must be a number.",
                    action: "updateDoctorSubscription:invalid-price",
                });
                return;
            }
            updateData.price = price;
        }
        // Check if at least one field is provided for update
        if (Object.keys(updateData).length === 0) {
            res.status(400).json({
                success: false,
                message: "Provide at least one field to update the subscription.",
                action: "updateDoctorSubscription:no-fields",
            });
            return;
        }
        const subscription = yield doctor_subscription_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that subscription.",
                action: "updateDoctorSubscription:not-found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Subscription updated successfully.",
            action: "updateDoctorSubscription:success",
            data: subscription,
        });
    }
    catch (error) {
        console.error("Error updating subscription:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't update the subscription.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.updateSubscription = updateSubscription;
const getSubscriptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subscriptions = yield doctor_subscription_1.default.find({});
        res.status(200).json({
            success: true,
            message: "Subscriptions fetched successfully.",
            action: "getDoctorSubscriptions:success",
            data: subscriptions,
        });
    }
    catch (error) {
        console.error("Error fetching subscriptions:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load the subscriptions.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getSubscriptions = getSubscriptions;
const getActiveSubscriptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const activeSubscriptions = yield doctor_subscription_1.default.find({
            isActive: true,
        });
        if (!activeSubscriptions || activeSubscriptions.length === 0) {
            res.status(404).json({
                success: false,
                message: "No active subscriptions are available right now.",
                action: "getActiveDoctorSubscriptions:none-found",
            });
            return;
        }
        // Generate signed URLs for all active subscriptions
        const subscriptionsWithSignedUrls = yield (0, signed_url_1.generateSignedUrlsForSubscriptions)(activeSubscriptions);
        res.status(200).json({
            success: true,
            message: "Active subscriptions fetched successfully.",
            action: "getActiveDoctorSubscriptions:success",
            data: subscriptionsWithSignedUrls,
        });
    }
    catch (error) {
        console.error("Error fetching active subscriptions:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load the active subscriptions.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getActiveSubscriptions = getActiveSubscriptions;
const deleteSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const subscription = yield doctor_subscription_1.default.findById(id);
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that subscription.",
                action: "deleteDoctorSubscription:not-found",
            });
            return;
        }
        const doctorsUsingSubscription = yield doctor_model_1.default.find({
            "subscriptions.SubscriptionId": id,
        });
        if (doctorsUsingSubscription.length > 0) {
            res.status(400).json({
                success: false,
                message: "This subscription is assigned to one or more doctors and cannot be deleted.",
                action: "deleteDoctorSubscription:in-use",
                data: {
                    doctorCount: doctorsUsingSubscription.length,
                },
            });
            return;
        }
        yield doctor_subscription_1.default.findByIdAndDelete(id);
        res.status(200).json({
            success: true,
            message: "Subscription deleted successfully.",
            action: "deleteDoctorSubscription:success",
        });
    }
    catch (error) {
        console.error("Error deleting subscription:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't delete the subscription.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.deleteSubscription = deleteSubscription;
