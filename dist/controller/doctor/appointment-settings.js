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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAppointmentSettings = void 0;
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const doctor_subscription_1 = __importDefault(require("../../models/doctor-subscription"));
const signed_url_1 = require("../../utils/signed-url");
const validation_1 = require("../../validation/validation");
const VALID_TYPES = ["online", "clinic", "homeVisit"];
/**
 * Unified handler for updating any of the 3 appointment-type settings.
 * Body: { type: "online" | "clinic" | "homeVisit", ...payload }
 */
const updateAppointmentSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const _c = req.body, { type } = _c, payload = __rest(_c, ["type"]);
        if (!type || !VALID_TYPES.includes(type)) {
            res.status(400).json({
                success: false,
                message: "Invalid or missing type. Use one of: online, clinic, homeVisit.",
                action: "updateAppointmentSettings:invalid-type",
            });
            return;
        }
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "You must be signed in to update appointment settings.",
                action: "updateAppointmentSettings:not-authenticated",
            });
            return;
        }
        const doctor = yield doctor_model_1.default.findOne({ userId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "updateAppointmentSettings:doctor-not-found",
            });
            return;
        }
        // --- ONLINE ---
        if (type === "online") {
            const parsed = validation_1.onlineAppointmentConfigUpdateSchema.safeParse(payload);
            if (!parsed.success) {
                res.status(400).json({
                    success: false,
                    message: "Please review the configuration details and try again.",
                    action: "updateAppointmentSettings:validation-error",
                    data: { errors: parsed.error.errors },
                });
                return;
            }
            const { availability, duration, isActive } = parsed.data;
            const updateFields = {};
            if (availability !== undefined) {
                updateFields["onlineAppointment.availability"] = availability;
            }
            if (duration !== undefined) {
                updateFields["onlineAppointment.duration"] = duration;
            }
            if (isActive !== undefined) {
                updateFields["onlineAppointment.isActive"] = isActive;
            }
            if (Object.keys(updateFields).length === 0) {
                res.status(400).json({
                    success: false,
                    message: "Provide availability, duration, or active status to update.",
                    action: "updateAppointmentSettings:no-fields",
                });
                return;
            }
            const updatedDoctor = yield doctor_model_1.default.findByIdAndUpdate(doctor._id, {
                $set: Object.assign(Object.assign({}, updateFields), { "onlineAppointment.updatedAt": new Date() }),
            }, { new: true, select: "-password" }).populate("userId");
            if (!updatedDoctor) {
                res.status(404).json({
                    success: false,
                    message: "We couldn't find the doctor profile.",
                    action: "updateAppointmentSettings:doctor-not-found",
                });
                return;
            }
            const doctorWithSignedUrls = yield (0, signed_url_1.generateSignedUrlsForUser)(updatedDoctor);
            res.status(200).json({
                success: true,
                message: "Online appointment settings updated successfully.",
                action: "updateAppointmentSettings:online-success",
                data: doctorWithSignedUrls,
            });
            return;
        }
        // --- CLINIC ---
        if (type === "clinic") {
            const validation = validation_1.clinicPatchRequestSchema.safeParse(payload);
            if (!validation.success) {
                res.status(400).json({
                    success: false,
                    message: "Please review the clinic details and try again.",
                    action: "updateAppointmentSettings:validation-error",
                    data: { errors: validation.error.errors },
                });
                return;
            }
            const validatedData = validation.data;
            if (Object.keys(validatedData).length === 0) {
                res.status(400).json({
                    success: false,
                    message: "Please provide fields to update.",
                    action: "updateAppointmentSettings:no-fields",
                });
                return;
            }
            const updateQuery = {};
            if (validatedData.clinics !== undefined) {
                const doc = yield doctor_model_1.default.findOne({ userId }).select("subscriptions");
                if (!doc) {
                    res.status(404).json({
                        success: false,
                        message: "We couldn't find your doctor profile.",
                        action: "updateAppointmentSettings:doctor-not-found",
                    });
                    return;
                }
                const activeSub = doc.subscriptions && doc.subscriptions.length > 0
                    ? doc.subscriptions[doc.subscriptions.length - 1]
                    : null;
                if (!activeSub || !activeSub.SubscriptionId) {
                    res.status(400).json({
                        success: false,
                        message: "No active subscription found. Please subscribe to a plan.",
                        action: "updateAppointmentSettings:no-active-subscription",
                    });
                    return;
                }
                const subDoc = yield doctor_subscription_1.default.findById(activeSub.SubscriptionId);
                if (!subDoc) {
                    res.status(400).json({
                        success: false,
                        message: "We couldn't find the associated subscription plan.",
                        action: "updateAppointmentSettings:subscription-not-found",
                    });
                    return;
                }
                const maxClinics = subDoc.no_of_clinics || 0;
                if (Array.isArray(validatedData.clinics) &&
                    validatedData.clinics.length > maxClinics) {
                    res.status(400).json({
                        success: false,
                        message: `Your subscription allows only ${maxClinics} clinics. Upgrade your plan to add more clinics.`,
                        action: "updateAppointmentSettings:clinic-limit",
                    });
                    return;
                }
                updateQuery["clinicVisit.clinics"] = validatedData.clinics;
            }
            if (validatedData.isActive !== undefined) {
                updateQuery["clinicVisit.isActive"] = validatedData.isActive;
            }
            const updatedDoctor = yield doctor_model_1.default.findOneAndUpdate({ userId }, { $set: updateQuery }, { new: true, select: "clinicVisit" });
            if (!updatedDoctor) {
                res.status(404).json({
                    success: false,
                    message: "We couldn't find your doctor profile.",
                    action: "updateAppointmentSettings:doctor-not-found",
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: "Clinic details updated successfully.",
                action: "updateAppointmentSettings:clinic-success",
                data: updatedDoctor.clinicVisit,
            });
            return;
        }
        // --- HOME VISIT ---
        if (type === "homeVisit") {
            const parsed = validation_1.homeVisitConfigUpdateSchema.safeParse(payload);
            if (!parsed.success) {
                res.status(400).json({
                    success: false,
                    message: "Please review the configuration details and try again.",
                    action: "updateAppointmentSettings:validation-error",
                    data: { errors: parsed.error.errors },
                });
                return;
            }
            const { isActive, fixedPrice, availability } = parsed.data;
            if (isActive !== undefined && doctor.homeVisit) {
                doctor.homeVisit.isActive = isActive;
            }
            if (fixedPrice !== undefined && doctor.homeVisit) {
                doctor.homeVisit.fixedPrice = fixedPrice;
            }
            if (availability && doctor.homeVisit) {
                doctor.homeVisit.availability = availability;
            }
            if (doctor.homeVisit) {
                doctor.homeVisit.updatedAt = new Date();
            }
            yield doctor.save();
            res.status(200).json({
                success: true,
                message: "Home visit configuration updated successfully.",
                action: "updateAppointmentSettings:homeVisit-success",
                data: doctor.homeVisit,
            });
            return;
        }
        res.status(400).json({
            success: false,
            message: "Invalid type.",
            action: "updateAppointmentSettings:invalid-type",
        });
    }
    catch (err) {
        console.error("Error in updateAppointmentSettings:", err);
        res.status(500).json({
            success: false,
            message: "We couldn't update the appointment settings.",
            action: (_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : String(err),
        });
    }
});
exports.updateAppointmentSettings = updateAppointmentSettings;
