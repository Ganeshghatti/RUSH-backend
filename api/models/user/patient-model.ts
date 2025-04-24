import mongoose from "mongoose";
import User from "./user-model";

const { Schema } = mongoose;

const patientSchema = new Schema({
  mapLocation: { type: String },
  insurance: {
    policyNumber: { type: String },
    provider: { type: String },
    image: { type: String },
  },
  healthMetrics: [
    {
      bloodPressure: { type: String }, // e.g., "120/80"
      bloodGlucose: { type: Number }, // Average blood glucose level
      weight: { type: Number }, // in kg
      height: { type: Number }, // in cm
      bloodGroup: {
        type: String,
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      },
      conditions: [{ type: String }],
      date: { type: Date, default: Date.now }, // Date when metrics were recorded
    },
  ],
});

const Patient = User.discriminator("patient", patientSchema);

export default Patient;
