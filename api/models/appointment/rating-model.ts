import mongoose from "mongoose";
const { Schema } = mongoose;

const ratingSchema = new Schema(
  {
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
  },
  { timestamps: true }
);
export const RatingModel = mongoose.model("RatingModel", ratingSchema);
