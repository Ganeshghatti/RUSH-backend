import mongoose from "mongoose";
const { Schema } = mongoose;

const unregisteredPatientSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: null,
    },
    disease: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const UnregisteredPatient = mongoose.model(
  "UnregisteredPatient",
  unregisteredPatientSchema
);
export default UnregisteredPatient;
