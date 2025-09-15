import mongoose from "mongoose";
const { Schema } = mongoose;

const resetPasswordSchema = new Schema({
  email: { type: String, required: true },
  role: { type: String, required: true },
  token: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // 10 minutes
  },
});

const ResetPassword = mongoose.model("ResetPassword", resetPasswordSchema);

export default ResetPassword;