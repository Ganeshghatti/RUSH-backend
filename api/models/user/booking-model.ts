import mongoose from "mongoose";
const { Schema } = mongoose;

const bookingSchema = new Schema({
  patientId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },
  appointmentType: {
    type: String,
    enum: ["Emergency", "Home Visit", "Online Visit", "Clinic Visit"],
    required: true,
  },
  appointmentDate: { type: Date, required: true },
  appointmentTime: { type: String, required: true }, // e.g. "15:30"

  // Optional: for Home Visit
  patientAddress: {
    type: String,
  },
  distanceInKm: {
    type: Number,
  },

  // Optional: for Clinic Visit
  clinicId: {
    type: Schema.Types.ObjectId,
    ref: "Doctor.clinics", // or handle separately if you want clinics as a model
  },

  // Optional: for Online Visit
  selectedDuration: {
    type: Number, // in minutes
  },
  
  amount: {
    type: Number,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  paymentDetails: {
    method: { type: String },
    transactionId: { type: String },
    paymentDate: { type: Date },
  },
  status: {
    type: String,
    enum: ["booked", "completed", "cancelled", "rescheduled"],
    default: "booked",
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;