import mongoose from "mongoose";
const { Schema } = mongoose;

const doctorSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  qualifications: [
    {
      degree: { type: String, required: true },
      college: { type: String, required: true },
      year: { type: Number, required: true },
      degreePost: { type: String, enum: ["UG", "PG", "PHD"], required: true },
      degreeImage: { type: String },
    },
  ],
  registration: [
    {
      regNumber: { type: String, required: true },
      council: { type: String, required: true },
      isVerified: { type: Boolean, default: false },
      licenseImage: { type: String },
      specialization: { type: String, required: true },
    },
  ],
  specialization: [{ type: String }],
  signatureImage: { type: String },
  experience: [
    {
      experienceName: { type: String, required: true }, // e.g., "Cardiology Consultant"
      institution: { type: String, required: true }, // e.g., "AIIMS"
      fromYear: { type: Number, required: true },
      toYear: { type: Number },
      isCurrent: { type: Boolean, default: false },
    },
  ],
  awards: [
    {
      name: { type: String },
      year: { type: Number },
    },
  ],
  subscriptions: [
    {
      startDate: { type: Date, required: true, default: Date.now },
      endDate: { type: Date },
      paymentDetails: {
        upiId: { type: String },
        paymentImage: { type: String },
      },
      SubscriptionId: {
        type: Schema.Types.ObjectId,
        ref: "DoctorSubscription",
        required: true,
      },
    },
  ],
  status: {
    type: String,
    enum: ["approved", "rejected", "pending"],
    default: "pending",
  },
  message: [{
    message: { type: String },
    date: { type: Date, default: Date.now },
  }],
});

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;