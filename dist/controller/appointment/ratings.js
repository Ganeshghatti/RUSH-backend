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
exports.getRatingById = exports.toggleRatingVisibility = exports.addRating = exports.getRatingsByDoctorId = exports.getMyRatings = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const rating_model_1 = require("../../models/appointment/rating-model");
const validation_1 = require("../../validation/validation");
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const getMyRatings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Hi");
        const userId = req.user.id;
        const doctor = yield doctor_model_1.default.findOne({ userId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found for this user",
            });
            return;
        }
        const ratings = yield rating_model_1.RatingModel.find({
            doctorId: doctor._id,
        })
            .populate({
            path: "patientId",
            populate: {
                path: "userId",
                select: "firstName lastName profilePic",
            },
        })
            .sort({ createdAt: -1 });
        console.log("Ratings ", ratings);
        res.status(200).json({
            success: true,
            message: "Doctor's ratings fetched successfully",
            data: ratings,
        });
    }
    catch (error) {
        console.error("Error fetching doctor's own ratings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch doctor's ratings",
        });
    }
});
exports.getMyRatings = getMyRatings;
// get all ratings by doctorId to show on doctor profile.
const getRatingsByDoctorId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { doctorId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(doctorId)) {
            res.status(400).json({
                success: false,
                message: "Invalid Doctor ID format",
            });
            return;
        }
        const ratings = yield rating_model_1.RatingModel.find({
            doctorId,
            isEnable: true,
        })
            .populate({
            path: "patientId",
            populate: {
                path: "userId",
                select: "firstName lastName profilePic",
            },
        })
            .sort({ createdAt: -1 });
        console.log("Ratings ", ratings);
        res.status(200).json({
            success: true,
            message: "Ratings fetched successfully",
            data: ratings,
        });
    }
    catch (error) {
        console.error("Error fetching ratings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch ratings",
        });
    }
});
exports.getRatingsByDoctorId = getRatingsByDoctorId;
// patient add new rating to an appointment
const addRating = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const patientUserId = req.user.id;
        // validate input
        const validationResult = validation_1.ratingSchemaZod.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationResult.error.errors,
            });
            return;
        }
        const { appointmentId, appointmentTypeRef, doctorId, rating, review } = validationResult.data;
        // see if the patientId exist.
        const patient = yield patient_model_1.default.findOne({ userId: patientUserId });
        if (!patient) {
            res.status(400).json({
                success: false,
                message: "Patient not found",
            });
            return;
        }
        // see if the doctorId exist.
        const doctor = yield doctor_model_1.default.findById(doctorId);
        if (!doctor) {
            res.status(400).json({
                success: false,
                message: "Doctor not found",
            });
            return;
        }
        // see if appointment exist.
        const AppointmentModel = mongoose_1.default.model(appointmentTypeRef);
        const appointment = yield AppointmentModel.findById(appointmentId);
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: "Appointment not found",
            });
            return;
        }
        if (!appointment.patientId.equals(patient.userId) ||
            !appointment.doctorId.equals(doctor._id)) {
            res.status(403).json({
                success: false,
                message: "You can only rate your own appointments",
            });
            return;
        }
        // check if appointment already have ratingId if yes do not create new overwrite the old
        if (appointment.ratingId) {
            yield rating_model_1.RatingModel.findByIdAndUpdate(appointment.ratingId, { rating, review }, { new: true });
            res.status(200).json({
                success: true,
                message: "Rating updated successfully",
            });
            return;
        }
        // if appointment already don't have ratingId, create new rating.
        const newRating = yield rating_model_1.RatingModel.create({
            appointmentId,
            appointmentTypeRef,
            doctorId: doctor._id,
            patientId: patient._id,
            rating,
            review,
        });
        // update the appointment model with ratingId.
        appointment.ratingId = newRating._id;
        yield appointment.save();
        res.status(201).json({
            success: true,
            message: "Rating added successfully",
            data: newRating,
        });
    }
    catch (error) {
        console.error("Error in adding the rating:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add rating",
        });
    }
});
exports.addRating = addRating;
// doctor can change isEnable status of a rating
const toggleRatingVisibility = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doctorUserId = req.user.id;
        const { ratingId } = req.params;
        const { isEnable } = req.body;
        // Find doctor by userId
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorUserId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
            return;
        }
        // Find the rating by id
        const rating = yield rating_model_1.RatingModel.findById(ratingId);
        if (!rating) {
            res.status(404).json({
                success: false,
                message: "Rating not found",
            });
            return;
        }
        // Ensure rating belongs to this doctor
        if (!rating.doctorId.equals(doctor._id)) {
            res.status(403).json({
                success: false,
                message: "Unauthorized to modify this rating",
            });
            return;
        }
        // Update visibility (toggle or set)
        if (typeof isEnable === "boolean") {
            rating.isEnable = isEnable;
        }
        else {
            rating.isEnable = !rating.isEnable; // toggle if not explicitly sent
        }
        yield rating.save();
        res.status(200).json({
            success: true,
            message: "Rating visibility updated successfully",
            data: { ratingId: rating._id, isEnable: rating.isEnable },
        });
    }
    catch (error) {
        console.error("Error toggling rating visibility:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update rating visibility",
        });
    }
});
exports.toggleRatingVisibility = toggleRatingVisibility;
// get a single rating by ratingId
const getRatingById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ratingId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(ratingId)) {
            res.status(400).json({
                success: false,
                message: "Invalid Rating ID format",
            });
            return;
        }
        // Find rating and populate related data
        const rating = yield rating_model_1.RatingModel.findById(ratingId);
        if (!rating) {
            res.status(404).json({
                success: false,
                message: "Rating not found",
            });
            return;
        }
        console.log("Rating ", rating);
        res.status(200).json({
            success: true,
            message: "Rating fetched successfully",
            data: rating,
        });
    }
    catch (error) {
        console.error("Error fetching rating by ID:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch rating",
        });
    }
});
exports.getRatingById = getRatingById;
