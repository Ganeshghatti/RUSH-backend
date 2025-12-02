import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
    {
        userId: { type: String },
        role: { type: String }, // doctor, patient, admin
        token: { type: String, required: true },
        deviceType: { type: String }, // android, ios, web
    },
    { timestamps: true }
);

export default mongoose.model("PushToken", tokenSchema);
