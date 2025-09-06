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
exports.updateDoctorProfile = exports.updateDoctorOnlineAppointment = void 0;
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const signed_url_1 = require("../../utils/signed-url");
const upload_media_1 = require("../../utils/aws_s3/upload-media");
const validation_1 = require("../../validation/validation");
const updateDoctorOnlineAppointment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { doctorId } = req.params;
        const { availability, duration, isActive } = req.body;
        // Validate doctorId
        if (!doctorId) {
            res.status(400).json({
                success: false,
                message: "Doctor ID is required",
            });
            return;
        }
        const updateFields = {};
        // Handle availability update if provided
        if (availability) {
            // Validate availability data
            if (!Array.isArray(availability)) {
                res.status(400).json({
                    success: false,
                    message: "Valid availability array is required",
                });
                return;
            }
            // Validate each availability entry
            for (const slot of availability) {
                if (!slot.day || !Array.isArray(slot.duration)) {
                    res.status(400).json({
                        success: false,
                        message: "Each availability slot must have a day and duration array",
                    });
                    return;
                }
                // Validate day value
                const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                if (!validDays.includes(slot.day.toLowerCase())) {
                    res.status(400).json({
                        success: false,
                        message: `Invalid day value. Must be one of: ${validDays.join(", ")}`,
                    });
                    return;
                }
                // Validate duration entries
                for (const duration of slot.duration) {
                    if (!duration.start || !duration.end) {
                        res.status(400).json({
                            success: false,
                            message: "Each duration must have start and end times",
                        });
                        return;
                    }
                }
            }
            updateFields["onlineAppointment.availability"] = availability;
        }
        // Handle duration update if provided
        if (duration) {
            // Validate duration data
            if (!Array.isArray(duration)) {
                res.status(400).json({
                    success: false,
                    message: "Valid duration array is required",
                });
                return;
            }
            // Validate each duration entry
            for (const slot of duration) {
                if (!slot.minute || !slot.price) {
                    res.status(400).json({
                        success: false,
                        message: "Each duration slot must have minute and price",
                    });
                    return;
                }
                // Validate minute value
                if (![15, 30].includes(slot.minute)) {
                    res.status(400).json({
                        success: false,
                        message: "Duration minute must be either 15 or 30",
                    });
                    return;
                }
                // Validate price value
                if (typeof slot.price !== 'number' || slot.price <= 0) {
                    res.status(400).json({
                        success: false,
                        message: "Price must be a positive number",
                    });
                    return;
                }
            }
            updateFields["onlineAppointment.duration"] = duration;
        }
        // Handle isActive update if provided
        if (typeof isActive === 'boolean') {
            updateFields["onlineAppointment.isActive"] = isActive;
        }
        // If neither availability, duration, nor isActive is provided
        if (Object.keys(updateFields).length === 0) {
            res.status(400).json({
                success: false,
                message: "Either availability, duration, or isActive must be provided",
            });
            return;
        }
        // Update the doctor's online appointment settings
        const updatedDoctor = yield doctor_model_1.default.findByIdAndUpdate(doctorId, {
            $set: Object.assign(Object.assign({}, updateFields), { "onlineAppointment.updatedAt": new Date() }),
        }, { new: true, select: '-password' }).populate("userId");
        if (!updatedDoctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
            return;
        }
        const doctorWithSignedUrls = yield (0, signed_url_1.generateSignedUrlsForUser)(updatedDoctor);
        res.status(200).json({
            success: true,
            data: doctorWithSignedUrls,
            message: "Online appointment settings updated successfully",
        });
    }
    catch (error) {
        console.error("Error updating online appointment settings:", error);
        res.status(500).json({
            success: false,
            message: "Error updating online appointment settings",
            error: error.message,
        });
    }
});
exports.updateDoctorOnlineAppointment = updateDoctorOnlineAppointment;
const updateDoctorProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Validate request body using Zod
        const validationResult = validation_1.updateProfileSchema.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationResult.error.errors,
            });
            return;
        }
        const { user, doctor } = validationResult.data;
        console.log("user to update", user);
        console.log("doctor to update", doctor);
        // Find the doctor record using userId
        const existingDoctor = yield doctor_model_1.default.findOne({ userId }).populate("userId");
        if (!existingDoctor) {
            res.status(404).json({
                success: false,
                message: "Doctor profile not found for this user",
            });
            return;
        }
        const updatePromises = [];
        // Helper function to process image fields and convert URLs to keys
        // Fixed to exclude date fields and other non-image fields
        const processImageFields = (data, parentKey) => __awaiter(void 0, void 0, void 0, function* () {
            if (!data || typeof data !== 'object')
                return data;
            const processedData = Object.assign({}, data);
            // List of fields that should NOT be processed for image URLs
            const excludeFields = ['dob', 'year', 'fromYear', 'toYear', 'minute', 'price'];
            for (const [key, value] of Object.entries(processedData)) {
                // Skip processing for excluded fields
                if (excludeFields.includes(key)) {
                    continue;
                }
                if (typeof value === 'string' && value.includes('https://')) {
                    // This is likely a presigned URL, convert to key
                    const extractedKey = yield (0, upload_media_1.getKeyFromSignedUrl)(value);
                    if (extractedKey) {
                        processedData[key] = extractedKey;
                    }
                }
                else if (Array.isArray(value)) {
                    // Process arrays recursively
                    processedData[key] = yield Promise.all(value.map((item) => __awaiter(void 0, void 0, void 0, function* () { return yield processImageFields(item, key); })));
                }
                else if (typeof value === 'object' && value !== null) {
                    // Process nested objects recursively
                    processedData[key] = yield processImageFields(value, key);
                }
            }
            return processedData;
        });
        // Update User model if user data is provided
        if (user && Object.keys(user).length > 0) {
            const userUpdateData = Object.assign({}, user);
            // Convert dob string to Date if provided (do this BEFORE processing image fields)
            if ((user === null || user === void 0 ? void 0 : user.dob) && typeof (user === null || user === void 0 ? void 0 : user.dob) === "string") {
                userUpdateData.dob = new Date(user.dob);
            }
            // Process image fields in user data (dob is now a Date object, so won't be processed)
            const processedUserData = yield processImageFields(userUpdateData);
            console.log("processed user data", processedUserData);
            updatePromises.push(user_model_1.default.findByIdAndUpdate(userId, { $set: processedUserData }, { new: true, runValidators: true, select: '-password' }));
        }
        // Update Doctor model if doctor data is provided
        if (doctor && Object.keys(doctor).length > 0) {
            // Process image fields in doctor data
            const processedDoctorData = yield processImageFields(doctor);
            console.log("processed doctor data", processedDoctorData);
            updatePromises.push(doctor_model_1.default.findByIdAndUpdate(existingDoctor._id, { $set: processedDoctorData }, { new: true, runValidators: true, select: '-password' }));
        }
        // Execute all update promises
        const updateResults = yield Promise.all(updatePromises);
        if (!updateResults) {
            res.status(500).json({
                success: false,
                message: "Failed to update doctor information",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: {},
            message: "Doctor profile updated successfully",
        });
    }
    catch (error) {
        console.error("Error updating doctor profile:", error);
        res.status(500).json({
            success: false,
            message: "Error updating doctor profile",
            error: error.message,
        });
    }
});
exports.updateDoctorProfile = updateDoctorProfile;
