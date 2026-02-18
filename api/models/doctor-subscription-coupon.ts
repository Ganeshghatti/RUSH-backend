import mongoose, { Schema } from "mongoose";

const DoctorSubscriptionCouponSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    discountPercent: {
      type: Number,
      required: [true, "Discount percentage is required"],
      min: [1, "Discount must be at least 1%"],
      max: [100, "Discount cannot exceed 100%"],
    },
    description: {
      type: String,
      default: "",
    },
    /** Empty = applicable to all doctor subscription plans; otherwise only these IDs */
    applicableSubscriptionIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "DoctorSubscription",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    validFrom: {
      type: Date,
      default: null,
    },
    validUntil: {
      type: Date,
      default: null,
    },
    maxUses: {
      type: Number,
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const DoctorSubscriptionCoupon = mongoose.model(
  "DoctorSubscriptionCoupon",
  DoctorSubscriptionCouponSchema
);

export default DoctorSubscriptionCoupon;
