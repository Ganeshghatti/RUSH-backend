"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const ratingSchema = new Schema({
    appointmentId: {
        type: Schema.Types.ObjectId,
        refPath: "appointmentTypeRef",
        required: true,
    },
    appointmentTypeRef: {
        type: String,
        required: true,
        enum: [
            "OnlineAppointment",
            "ClinicAppointment",
            "HomeVisitAppointment",
            "EmergencyAppointment",
        ],
    },
    doctorId: {
        type: Schema.Types.ObjectId,
        ref: "Doctor",
        required: true,
    },
    patientId: {
        type: Schema.Types.ObjectId,
        ref: "Patient",
        required: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String },
    isEnable: { type: Boolean, default: true },
}, { timestamps: true });
exports.RatingModel = mongoose_1.default.model("RatingModel", ratingSchema);
