import mongoose from "mongoose";
const { Schema } = mongoose;

export interface IFamily {
  patientId: mongoose.Types.ObjectId;
  relationship:
    | "Father"
    | "Mother"
    | "Child"
    | "Sister"
    | "Brother"
    | "Father-in-law"
    | "Mother-in-law"
    | "Other";
  profilePic?: string;
  gender?: "Male" | "Female" | "Other";
  age?: number;
  email?: string;
  address: {
    line1?: string;
    line2?: string;
    locality?: string;
    city?: string;
    pincode?: string;
    country?: string;
  };
  mobile?: string;
  idNumber?: string;
  idImage?: string;
  insurance: {
    policyNumber?: string;
    provider?: string;
    image?: string;
  };
  healthMetrics?: {
    diabetes: Boolean;
    hypertension: Boolean;
    heartDisease: Boolean;
    stroke: Boolean;
    cancer: [String];
    thyroid: Boolean;
    mentalIllness: Boolean;
    geneticDisorders: Boolean;
    Other: String;
  };
}

export type FamilyDocument = IFamily & mongoose.Document;

const familySchema = new Schema<IFamily>({
  patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
  relationship: {
    type: String,
    enum: [
      "Father",
      "Mother",
      "Child",
      "Sister",
      "Brother",
      "Father-in-law",
      "Mother-in-law",
      "Other",
    ],
    required: true,
  },
  profilePic: { type: String },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
  },
  age: { type: Number },
  email: { type: String },
  address: {
    line1: { type: String },
    line2: { type: String },
    locality: { type: String },
    city: { type: String },
    pincode: { type: String },
    country: { type: String },
  },
  mobile: { type: String },
  idNumber: { type: String },
  idImage: { type: String },
  insurance: {
    policyNumber: { type: String },
    provider: { type: String },
    image: { type: String },
  },
  healthMetrics: {
    diabetes: Boolean,
    hypertension: Boolean,
    heartDisease: Boolean,
    stroke: Boolean,
    cancer: [String],
    thyroid: Boolean,
    mentalIllness: Boolean,
    geneticDisorders: Boolean,
    Other: String,
  },
});

const Family = mongoose.model("Family", familySchema);

export default Family;
