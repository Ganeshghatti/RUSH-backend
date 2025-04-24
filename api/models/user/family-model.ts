import mongoose from "mongoose";

const { Schema } = mongoose;

const familySchema = new Schema({
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
  address: {
    line1: { type: String },
    line2: { type: String },
    locality: { type: String },
    city: { type: String },
    pincode: { type: String },
    country: { type: String },
  },
  mobile: { type: String },
  email: { type: String },
  idNumber: { type: String },
  idImage: { type: String },
  insurance: {
    policyNumber: { type: String },
    provider: { type: String },
    image: { type: String },
  },
  healthMetrics: [
    {
      bloodPressure: { type: String },
      bloodGlucose: { type: Number },
      weight: { type: Number },
      height: { type: Number },
      bloodGroup: {
        type: String,
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      },
      conditions: [{ type: String }],
    },
  ],
});

const Family = mongoose.model("Family", familySchema);

export default Family;
