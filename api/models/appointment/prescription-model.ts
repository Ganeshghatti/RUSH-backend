import mongoose from "mongoose";
const { Schema } = mongoose;

const medicineSchema = new Schema({
  type: { type: String, required: true },
  name: { type: String, required: true },
  mg: { type: String },
  morning: { type: Number, default: 0 },
  noon: { type: Number, default: 0 },
  evening: { type: Number, default: 0 },
  night: { type: Number, default: 0 },
  durationDays: { type: Number, required: true },
});

const prescriptionSchema = new Schema(
  {
    // _id of prescription will be REF NO
    appointmentId: {
      type: Schema.Types.ObjectId,
      refPath: "appointmentTypeRef",
      required: true,
    },
    appointmentTypeRef: {
      type: String,
      required: true,
      enum: [
        "OnlineAppointment",
        "ClinicAppointment",
        "HomeVisitAppointment",
        "EmergencyAppointment",
      ],
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symptoms: { type: String },
    medicines: [medicineSchema],
    labTest: { type: String },
    notes: { type: String },
    nextAppointmentDate: { type: Date },
  },
  { timestamps: true }
);
export const Prescription = mongoose.model("Prescription", prescriptionSchema);
