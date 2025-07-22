import mongoose from "mongoose";
const { Schema } = mongoose;

const clinicAppointmentSchema = new Schema({
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
  clinicId: {
    type: String,
    required: true,
  },
  clinicDetails: {
    clinicName: { type: String, required: true },
    address: {
      line1: { type: String, required: true },
      line2: { type: String },
      landmark: { type: String },
      locality: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, required: true },
    },
    consultationFee: { type: Number, required: true },
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
  history: {
    title: {
      type: String,
    },
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "cancelled", "expired"],
    default: "pending",
  },
  otp: {
    code: { type: String },
    generatedAt: { type: Date },
    expiresAt: { type: Date },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    isUsed: { type: Boolean, default: false },
  },
  paymentDetails: {
    amount: { type: Number, required: true },
    walletDeducted: { type: Number, required: true },
    paymentStatus: { 
      type: String, 
      enum: ["pending", "completed", "failed"], 
      default: "completed" 
    },
  },
}, {
  timestamps: true,
});

// Index for efficient queries
clinicAppointmentSchema.index({ doctorId: 1, "slot.day": 1 });
clinicAppointmentSchema.index({ patientId: 1, "slot.day": 1 });
clinicAppointmentSchema.index({ status: 1 });

const ClinicAppointment = mongoose.model(
  "ClinicAppointment",
  clinicAppointmentSchema
);

export default ClinicAppointment;
