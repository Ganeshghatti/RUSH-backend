import mongoose from "mongoose";
const { Schema } = mongoose;

export interface IFamily {
  patientId: mongoose.Types.ObjectId;
  relationship:
    | "Father"
    | "Mother"
    | "Child"
    | "Spouse"
    | "Sister"
    | "Brother"
    | "Father-in-law"
    | "Mother-in-law"
    | "Other";
  basicDetails: {
    name: string;
    gender: "Male" | "Female" | "Other";
    age: number;
    email?: string;
    mobile?: string;
  };
  address?: {
    line1?: string;
    line2?: string;
    locality?: string;
    city?: string;
    pincode?: string;
    country?: string;
  };
  idProof?: {
    idType?: string;
    idNumber?: string;
    idImage?: string;
  };
  insurance?: {
    policyNumber?: string;
    provider?: string;
    image?: string;
  }[];
  healthMetricsId?: mongoose.Types.ObjectId;
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
      "Spouse",
      "Sister",
      "Brother",
      "Father-in-law",
      "Mother-in-law",
      "Other",
    ],
    required: true,
  },
  basicDetails: {
    name: { type: String, required: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    age: {
      type: Number,
      min: [0, "Age cannot be negative"],
      required: true,
    },
    email: { type: String },
    mobile: { type: String },
  },
  address: {
    line1: { type: String },
    line2: { type: String },
    locality: { type: String },
    city: { type: String },
    pincode: { type: String },
    country: { type: String },
  },
  idProof: {
    idType: String,
    idNumber: String,
    idImage: String, // store the key of image
  },
  insurance: [
    {
      policyNumber: { type: String },
      provider: { type: String },
      image: { type: String },
    },
  ],
  healthMetricsId: { type: Schema.Types.ObjectId, ref: "HealthMetrics" },
});

const Family = mongoose.model("Family", familySchema);

export default Family;
