import mongoose from "mongoose";
const { Schema } = mongoose;

const onlineAppointmentSchema = new Schema({
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
  slot: {
    day: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    time: {
      start: {
        type: Date,
        required: true,
      },
      end: {
        type: Date,
        required: true,
      },
    },
  },
  history: {
    title: {
      type: String,
    }
  },
  status: {
    type: String,

    enum: ["pending", "accepted", "rejected", "completed", "expired"],
    default: "pending",
  },
  roomName: {
    type: String,
  }
});

const OnlineAppointment = mongoose.model(
  "OnlineAppointment",
  onlineAppointmentSchema
);

export default OnlineAppointment;
