import mongoose from "mongoose";
const { Schema } = mongoose;

const patientSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

const Patient = mongoose.model("Patient", patientSchema);

export default Patient;
