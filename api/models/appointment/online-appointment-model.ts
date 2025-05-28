import mongoose from "mongoose";
const { Schema } = mongoose;

const onlineAppointmentSchema = new Schema({
  doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
  duration: [
    {
      minute: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      },
    },
  ],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const OnlineAppointment = mongoose.model("OnlineAppointment", onlineAppointmentSchema);

export default OnlineAppointment; 