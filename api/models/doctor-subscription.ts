import mongoose, { Schema } from "mongoose";

const DoctorSubscriptionSchema = new Schema(
  {
    price: {
      type: Number,
      required: [true, "Subscription price is required"],
    },
    name: {
      type: String,
      required: [true, "Subscription name is required"],
    },
    description: {
      type: String,
      required: [true, "Subscription description is required"],
    },
    qrCodeImage: {
      type: String,
      required: [true, "QR code image is required for subscription"],
    },
    features: [
      {
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    duration: {
      type: String,
      required: [true, "Subscription duration is required"],
      enum: ["1 month", "3 months", "1 year", "2 years", "20 years", "15 years", "10 years", "5 years", "40 years", "lifetime"],
    },

     platformFee: {
      type: Number,
      min: [0, "Platform fee must be a positive number"],
    },
    operationalExpense: {
      type: Number,
      min: [0, "Operational expense must be at least 0%"],
      max: [100, "Operational expense cannot exceed 100%"],
    },
  },
  {
    timestamps: true,
  }
);

const DoctorSubscription = mongoose.model("DoctorSubscription", DoctorSubscriptionSchema);

export default DoctorSubscription;