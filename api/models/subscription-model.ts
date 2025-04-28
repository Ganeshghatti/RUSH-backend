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
      enum: ["1 month", "3 months", "1 year", "2 years", "lifetime"],
    },
  },
  {
    timestamps: true,
  }
);

const DoctorSubscription = mongoose.model("DoctorSubscription", DoctorSubscriptionSchema);

export default DoctorSubscription;