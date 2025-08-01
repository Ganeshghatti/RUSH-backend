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
    history: {
      title: {
        type: String,
      },
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed", "expired"],
      default: "pending",
    },
    otp: {
      code: String,
      generatedAt: Date,
      expiresAt: Date,
      attempts: { type: Number, default: 0 },
      maxAttempts: { type: Number, default: 3 },
      isUsed: { type: Boolean, default: false },
    },
    paymentDetails: {
      fixedPrice: { type: Number, required: true },
      travelCost: { type: Number, required: true },
      total: { type: Number, required: true },
      walletFrozen: { type: Boolean, default: false },
      paymentStatus: {
        type: String,
        enum: ["pending", "frozen", "completed", "failed"],
        default: "pending",
      },
    },
    doctorIp: String,
    patientIp: String,
    doctorGeo: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: [Number],
    },
    patientGeo: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: [Number],
    },
  },
  {
    timestamps: true,
  }
);

homeVisitAppointmentSchema.index({ doctorGeo: "2dsphere" });
homeVisitAppointmentSchema.index({ patientGeo: "2dsphere" });

const HomeVisitAppointment = mongoose.model(
  "HomeVisitAppointment",
  homeVisitAppointmentSchema
);

export default HomeVisitAppointment;
