import mongoose from "mongoose";
import User from "./user-model";

const { Schema } = mongoose;

const doctorSchema = new Schema({
  qualifications: [
    {
      degree: { type: String, required: true },
      isVerified: { type: Boolean, default: false },
      college: { type: String, required: true },
      year: { type: Number, required: true },
      isPostGraduate: { type: Boolean, default: false },
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
      signatureImage: { type: String },
    },
  ],
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
    panNumber: { type: String },
    image: { type: String },
    isVerified: { type: Boolean, default: false },
    other: {
      idNumber: { type: String },
      idName: { type: String },
      image: { type: String },
    },
  },
  awards: [
    {
      name: { type: String, required: true },
      year: { type: Number, required: true },
    },
  ],
  isSubscribed: { type: Boolean, default: false }, // Indicates current subscription status
  subscriptions: [
    {
      planName: { type: String, required: true }, // e.g., "Premium", "Basic"
      startDate: { type: Date, required: true },
      endDate: { type: Date },
      isActive: { type: Boolean, default: false },
      paymentId: { type: String }, // Optional, for tracking payment
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
