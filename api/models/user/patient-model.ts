import mongoose from "mongoose";
const { Schema } = mongoose;

const patientSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  password: { type: String, required: true },
  mapLocation: { type: String },
  insurance: {
    policyNumber: { type: String },
    provider: { type: String },
    image: { type: String },
  },
    subscriptions: [
    {
      startDate: { type: Date, required: true, default: Date.now },
      endDate: { type: Date },
      // paymentDetails: {
      //   upiId: { type: String },
      //   paymentImage: { type: String },
      // },
      SubscriptionId: {
        type: Schema.Types.ObjectId,
        ref: "PatientSubscription",
        required: true,
      },
      razorpay_order_id: { type: String },
      razorpay_payment_id: { type: String },
    },
  ],
  healthMetricsId: { type: Schema.Types.ObjectId, ref: "HealthMetrics" },
});

const Patient = mongoose.model("Patient", patientSchema);

export default Patient;