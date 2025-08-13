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
    },
    gender: {
      type: String,
      trim: true,
      default: null,
    },
    age: {
      type: Number,
      default: null
    },

    // Location details
    address: {
      type: String,
      trim: true,
      default: null,
    },
    locality: {
      type: String,
      trim: true,
      default: null,
    },
    pincode: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    state: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: "India",
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
