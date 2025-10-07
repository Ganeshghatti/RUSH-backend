import mongoose from "mongoose";
const { Schema } = mongoose;

const doctorSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  password: { type: String, required: true },
  qualifications: [
    {
      degree: { type: String },
      college: { type: String },
      year: { type: Number },
      degreePost: {
        type: String,
        enum: ["UG", "PG", "PHD", "graduate", "fellowship"],
        default: "UG",
      },
      degreeImage: { type: String },
    },
  ],
  registration: [
    {
      regNumber: { type: String },
      council: { type: String },
      isVerified: { type: Boolean, default: false },
      licenseImage: { type: String },
      specialization: { type: String },
    },
  ],
  specialization: [{ type: String }],
  signatureImage: { type: String },
  experience: [
    {
      experienceDescription: { type: String }, // e.g., "Cardiology Consultant"
      hospitalName: { type: String },
      fromYear: { type: Number, default: null },
      toYear: { type: Number, default: null },
      isCurrent: { type: Boolean, default: false },
    },
  ],
  awards: [
    {
      name: { type: String },
      year: { type: Number },
    },
  ],
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
        ref: "DoctorSubscription",
        required: true,
      },
      razorpay_order_id: { type: String },
      razorpay_payment_id: { type: String },
      amount_paid: {type: Number}
    },
  ],
  status: {
    type: String,
    enum: ["not-submited", "approved", "rejected", "pending"],
    default: "not-submited",
  },
  onlineAppointment: {
    duration: [
      {
        minute: {
          type: Number,
          enum: [15, 30],
          default: 15,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    availability: [
      {
        day: {
          type: String,
          enum: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
        },
        duration: [
          {
            start: {
              type: String,
            },
            end: {
              type: String,
            },
          },
        ],
      },
    ],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  emergencyCall: {
    isActive: { type: Boolean, default: false },
    duration: [
      {
        minute: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    phoneNumber: { type: String },
  },
  homeVisit: {
    isActive: { type: Boolean, default: false },
    fixedPrice: { type: Number, default: 0 },
    availability: [
      {
        day: {
          type: String,
          enum: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
        },
        duration: [
          {
            start: {
              type: String,
            },
            end: {
              type: String,
            },
          },
        ],
      },
    ],
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  clinicVisit: {
    isActive: { type: Boolean, default: false },
    clinics: [
      {
        clinicName: { type: String, required: true },
        address: {
          line1: { type: String, required: true },
          line2: { type: String },
          landmark: { type: String },
          locality: { type: String, required: true },
          city: { type: String, required: true },
          pincode: { type: String, required: true },
          country: { type: String, required: true, default: "India" },
        },
        consultationFee: { type: Number, required: true },
        frontDeskName: { type: String, required: true },
        frontDeskNumber: { type: String, required: true },
        availability: [
          {
            day: {
              type: String,
              required: true,
              enum: [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
              ],
            },
            timings: [
              {
                startTime: { type: String, required: true },
                endTime: { type: String, required: true },
              },
            ],
          },
        ],
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  earnings: {
    type: Number,
    default: 0,
  },
  isActive: { type: Boolean, default: true },
  message: [
    {
      message: { type: String },
      date: { type: Date, default: Date.now },
    },
  ],
});

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;
