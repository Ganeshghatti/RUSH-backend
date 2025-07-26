import mongoose from "mongoose";
const { Schema } = mongoose;

const patientSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  password: { type: String, required: true },
  mapLocation: { type: String },
  insurance: {
    policyNumber: { type: String },
    provider: { type: String },
    image: { type: String },
  },
  healthMetricsId: { type: Schema.Types.ObjectId, ref: "HealthMetrics" },
});

const Patient = mongoose.model("Patient", patientSchema);

export default Patient;