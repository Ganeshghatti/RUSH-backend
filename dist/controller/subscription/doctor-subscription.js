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
const upload_media_1 = require("../../utils/aws_s3/upload-media");
const qrcode_1 = __importDefault(require("qrcode"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const delete_media_1 = require("../../utils/aws_s3/delete-media");
const signed_url_1 = require("../../utils/signed-url");
const createSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { price, name, description, features, isActive, duration, platformFeeOnline, opsExpenseOnline, platformFeeClinic, opsExpenseClinic, platformFeeEmergency, opsExpenseEmergency, platformFeeHomeVisit, opsExpenseHomeVisit, doctor_type } = req.body;
        if (price < 0) {
            res.status(400).json({
                success: false,
                message: "Price must be a non-negative number (0 or greater)",
            });
            return;
        }
        if (platformFeeOnline < 0 || platformFeeClinic < 0 || platformFeeEmergency < 0 || platformFeeHomeVisit < 0) {
            res.status(400).json({
                success: false,
                message: "Platform fee must be a non-negative number (0 or greater)",
            });
            return;
        }
        // Validate required fields
        if (!name || !description || !duration) {
            res.status(400).json({
                success: false,
                message: "Missing required subscription fields: price, name, description, and duration are required",
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
            duration,
            qrCodeImage: signedUrl,
            platformFeeOnline: Number(parseFloat(platformFeeOnline).toFixed(2)),
            opsExpenseOnline: Number(parseFloat(opsExpenseOnline).toFixed(2)),
            platformFeeClinic: Number(parseFloat(platformFeeClinic).toFixed(2)),
            opsExpenseClinic: Number(parseFloat(opsExpenseClinic).toFixed(2)),
            platformFeeHomeVisit: Number(parseFloat(platformFeeHomeVisit).toFixed(2)),
            opsExpenseHomeVisit: Number(parseFloat(opsExpenseHomeVisit).toFixed(2)),
            platformFeeEmergency: Number(parseFloat(platformFeeEmergency).toFixed(2)),
            opsExpenseEmergency: Number(parseFloat(opsExpenseEmergency).toFixed(2)),
        });
        res.status(201).json({
            success: true,
            message: "Subscription created successfully",
            data: subscription,
        });
    }
    catch (error) {
        console.error("Error creating subscription:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create subscription",
        });
    }
});
exports.createSubscription = createSubscription;
const updateSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { isActive, name, description, features, price, platformFeeOnline, opsExpenseOnline, platformFeeClinic, opsExpenseClinic, platformFeeHomeVisit, opsExpenseHomeVisit, platformFeeEmergency, opsExpenseEmergency } = req.body;
        // Build update object with only provided fields
        const updateData = {};
        // Validate and add isActive if provided
        if (isActive !== undefined) {
            if (typeof isActive !== "boolean") {
                res.status(400).json({
                    success: false,
                    message: "isActive field must be a boolean",
                });
                return;
            }
            updateData.isActive = isActive;
        }
        // Validate and add name if provided
        if (name !== undefined) {
            if (typeof name !== "string" || name.trim() === "") {
                res.status(400).json({
                    success: false,
                    message: "name field must be a non-empty string",
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
                    message: "description field must be a non-empty string",
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
                    message: "features field must be an array",
                });
                return;
            }
            // Validate each feature is a string
            for (const feature of features) {
                if (typeof feature !== "string" || feature.trim() === "") {
                    res.status(400).json({
                        success: false,
                        message: "All features must be non-empty strings",
                    });
                    return;
                }
            }
            updateData.features = features.map((feature) => feature.trim());
        }
        //add fee
        updateData.platformFeeOnline = platformFeeOnline;
        updateData.opsExpenseOnline = opsExpenseOnline;
        updateData.platformFeeClinic = platformFeeClinic;
        updateData.opsExpenseClinic = opsExpenseClinic;
        updateData.platformFeeHomeVisit = platformFeeHomeVisit;
        updateData.opsExpenseHomeVisit = opsExpenseHomeVisit;
        updateData.platformFeeEmergency = platformFeeEmergency;
        updateData.opsExpenseEmergency = opsExpenseEmergency;
        // validate and add price if provided
        if (price !== undefined) {
            if (typeof price !== "number") {
                res.status(400).json({
                    success: false,
                    message: "Price field must be a number",
                });
                return;
            }
            updateData.price = price;
        }
        // Check if at least one field is provided for update
        if (Object.keys(updateData).length === 0) {
            res.status(400).json({
                success: false,
                message: "At least one field (isActive, name, description, or features) must be provided for update",
            });
            return;
        }
        const subscription = yield doctor_subscription_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: "Subscription not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Subscription updated successfully",
            data: subscription,
        });
    }
    catch (error) {
        console.error("Error updating subscription:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update subscription",
        });
    }
});
exports.updateSubscription = updateSubscription;
const getSubscriptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subscriptions = yield doctor_subscription_1.default.find({});
        const subscriptionsWithSignedUrls = yield (0, signed_url_1.generateSignedUrlsForSubscriptions)(subscriptions);
        res.status(200).json({
            success: true,
            message: "Subscriptions fetched successfully",
            data: subscriptionsWithSignedUrls,
        });
    }
    catch (error) {
        console.error("Error fetching subscriptions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch subscriptions",
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
                message: "No active subscriptions found",
            });
            return;
        }
        // Generate signed URLs for all active subscriptions
        const subscriptionsWithSignedUrls = yield (0, signed_url_1.generateSignedUrlsForSubscriptions)(activeSubscriptions);
        res.status(200).json({
            success: true,
            message: "Active subscriptions fetched successfully",
            data: subscriptionsWithSignedUrls,
        });
    }
    catch (error) {
        console.error("Error fetching active subscriptions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch active subscriptions",
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
                message: "Subscription not found",
            });
            return;
        }
        const doctorsUsingSubscription = yield doctor_model_1.default.find({
            "subscriptions.SubscriptionId": id
        });
        if (doctorsUsingSubscription.length > 0) {
            res.status(400).json({
                success: false,
                message: "Cannot delete this subscription as it is currently used by one or more doctors",
                doctorCount: doctorsUsingSubscription.length,
            });
            return;
        }
        // Extract QR code image URL to delete from S3
        const qrCodeUrl = subscription.qrCodeImage;
        // Delete the subscription from database
        yield doctor_subscription_1.default.findByIdAndDelete(id);
        // Extract the key from the URL for S3 deletion
        if (qrCodeUrl) {
            try {
                const urlParts = qrCodeUrl.split('/');
                const key = urlParts.slice(3).join('/');
                if (key) {
                    yield (0, delete_media_1.DeleteMediaFromS3)({ key });
                }
            }
            catch (error) {
                console.error("Error deleting QR code image from S3:", error);
            }
        }
        res.status(200).json({
            success: true,
            message: "Subscription deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting subscription:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete subscription",
        });
    }
});
exports.deleteSubscription = deleteSubscription;
