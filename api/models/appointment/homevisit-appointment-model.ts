import mongoose from "mongoose";
const { Schema } = mongoose;

const homeVisitAppointmentSchema = new Schema(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    slot: {
      day: {
        type: Date,
        required: true,
      },
      duration: {
        type: Number,
        required: true,
        enum: [15, 30, 45, 60],
      },
      time: {
        start: {
          type: Date,
          required: true,
        },
        end: {
          type: Date,
          required: true,
        },
      },
    },
    patientAddress: {
      line1: { type: String, required: true },
      line2: { type: String },
      landmark: { type: String },
      locality: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, required: true, default: "India" },
      location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true },
      },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "doctor_accepted",
        "patient_confirmed",
        "completed",
        "cancelled",
        "expired",
      ],
      default: "pending",
    },
    pricing: {
      fixedCost: { type: Number, required: true },
      travelCost: { type: Number, default: 0 }, // Doctor adds this after accepting
      totalCost: { type: Number }, // fixedCost + travelCost
    },
    otp: {
      code: { type: String },
      generatedAt: { type: Date },
      attempts: { type: Number, default: 0 },
      maxAttempts: { type: Number, default: 3 },
      isUsed: { type: Boolean, default: false },
    },
    paymentDetails: {
      amount: { type: Number },
      walletDeducted: { type: Number },
      walletFrozen: { type: Number },
      paymentStatus: {
        type: String,
        enum: ["pending", "frozen", "completed", "failed"],
        default: "pending",
      },
    },
    doctorIp: String,
    patientIp: String,
    patientGeo: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: [Number],
    },
    prescriptionId: { type: Schema.Types.ObjectId, ref: "Prescription" },
    ratingId: {type: Schema.Types.ObjectId, ref: "RatingModel"}
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
homeVisitAppointmentSchema.index({ doctorId: 1, "slot.day": 1 });
homeVisitAppointmentSchema.index({ patientId: 1, "slot.day": 1 });
homeVisitAppointmentSchema.index({ status: 1 });
homeVisitAppointmentSchema.index({ patientGeo: "2dsphere" });

const HomeVisitAppointment = mongoose.model(
  "HomeVisitAppointment",
  homeVisitAppointmentSchema
);

export default HomeVisitAppointment;
