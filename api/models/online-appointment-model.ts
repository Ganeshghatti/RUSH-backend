import mongoose from "mongoose";
const { Schema } = mongoose;

const onlineAppointmentSchema = new Schema({
    patientId: {type: Schema.Types.ObjectId, ref: "Patient", required: true},
    doctorId: {type: Schema.Types.ObjectId, ref: "Doctor", required: true},
    appointmentDate: { type: Date, required: true },
    duration: {
        type: Number,
        enum: [15, 30, 45, 60],
        required: true,
    },
    status: {
        type: String,
        enum: ["scheduled", "cancelled", "completed"],
        default: "scheduled",
    },
    twilioRoomSid: {
      type: String,
    },
    twilioRoomCode: {
        type: String
    },
    createdAt: { type: Date, default: Date.now },
});

const OnlineAppointment = mongoose.model("OnlineAppointment", onlineAppointmentSchema);
export default OnlineAppointment;