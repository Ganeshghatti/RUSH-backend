import mongoose from "mongoose";
const { Schema } = mongoose;

const clinicSchema = new Schema({
  doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
  address: { type: String, required: true },
  pincode: { type: String, required: true },
  contact: { type: String, required: true },
  isHospital: { type: Boolean, required: true }, // true = hospital, false = clinic
  openDays: [
    { type: String, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
  ],
  timeRange: {
    start: { type: String },
    end: { type: String },
  }, // e.g., { start: "09:00", end: "17:00" }
  consultDuration: { type: Number }, // in minutes
  proofType: {
    type: String,
    enum: ["Passport", "Aadhaar", "DrivingLicense", "Other"],
  },
  proofImage: { type: String },
  otherProof: {
    idNumber: { type: String },
    idImage: { type: String },
  },
});

const Clinic = mongoose.model("Clinic", clinicSchema);

export default Clinic;