import mongoose, { Schema } from "mongoose";

const SubscriptionSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    price: {
      type: Number,
      required: [true, "Subscription price is required"],
    },
    type: {
      type: String,
      required: [true, "Subscription type is required"],
      enum: ["basic", "premium", "pro"],
    },
    interval: {
      type: String,
      required: [true, "Subscription interval is required"],
      enum: ["monthly", "annually"],
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, "Subscription end date is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    paymentId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

SubscriptionSchema.index({ userId: 1, isActive: 1 });

const Subscription = mongoose.model("Subscription", SubscriptionSchema);

export default Subscription;
