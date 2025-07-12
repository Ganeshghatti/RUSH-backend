import mongoose from "mongoose";
const { Schema } = mongoose;

const emergencyAppointmentSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
    },
    media: [{
      type: String, // URL or file path for media
    }],
    location: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "expired"],
      default: "pending",
    },
    roomName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

const EmergencyAppointment = mongoose.model(
  "EmergencyAppointment",
  emergencyAppointmentSchema
);

export default EmergencyAppointment; 