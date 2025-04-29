import mongoose from "mongoose";
import User from "./user-model";

const { Schema } = mongoose;

const doctorSchema = new Schema({
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
      regNumber: { type: String, required: true, unique: true },
      council: { type: String, required: true },
      isVerified: { type: Boolean, default: false },
      licenseImage: { type: String },
      specialization: { type: String, required: true },
    },
  ],
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
  taxProof: {
    type: { type: String, enum: ["PAN", "Other"] },
    idNumber: { type: String }, // pan no.
    image: { type: String },
    idName: { type: String }, // for other only
    isVerified: { type: Boolean, default: false },
  },
  awards: [
    {
      name: { type: String, required: true },
      year: { type: Number, required: true },
    },
  ],
  subscriptions: [
    {
      startDate: { type: Date, required: true, default: Date.now },
      endDate: { type: Date },
      paymentDetails: {
        paymentId: { type: String },
        amount: { type: Number },
        status: { type: String, enum: ["success", "failed"] },
        paymentMethod: { type: String, enum: ["upi", "card"] },
      },
      SubscriptionId: {
        type: Schema.Types.ObjectId,
        ref: "DoctorSubscription",
        required: true,
      },
    },
  ],
  bankDetails: {
    accountName: { type: String, required: true },
    accountNumber: { type: String, required: true, unique: true },
    ifscCode: { type: String, required: true },
    bankName: { type: String, required: true },
    bankAddress: { type: String, required: true },
    upiId: { type: String },
    upiQrImage: { type: String },
    upiProvider: { type: String },
  },
});

const Doctor = User.discriminator("doctor", doctorSchema);

export default Doctor;
