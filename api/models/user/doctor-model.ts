import mongoose from "mongoose";
const { Schema } = mongoose;

const doctorSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  password: { type: String, required: true },
  qualifications: [
    {
      degree: { type: String },
      college: { type: String },
      year: { type: Number },
      degreePost: { type: String, enum: ["UG", "PG", "PHD", "graduate", "fellowship"], default: "UG" },
      degreeImage: { type: String },
    },
  ],
  registration: [
    {
      regNumber: { type: String },
      council: { type: String },
      isVerified: { type: Boolean, default: false },
      licenseImage: { type: String },
      specialization: { type: String },
    },
  ],
  specialization: [{ type: String }],
  signatureImage: { type: String },
  experience: [
    {
      experienceDescription: { type: String }, // e.g., "Cardiology Consultant"
      hospitalName: { type: String }, // e.g., "AIIMS"
      fromYear: { type: Number },
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
    enum: ["not-submited", "approved", "rejected", "pending"],
    default: "not-submited",
  },
  message: [{
    message: { type: String },
    date: { type: Date, default: Date.now },
  }],
});

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;