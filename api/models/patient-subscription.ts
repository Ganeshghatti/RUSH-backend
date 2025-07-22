import mongoose, { Schema } from "mongoose";

const PatientSubscriptionSchema = new Schema(
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
  },
  {
    timestamps: true,
  }
);

const PatientSubscription = mongoose.model("PatientSubscription", PatientSubscriptionSchema);

export default PatientSubscription;