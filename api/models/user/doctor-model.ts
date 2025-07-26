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
        frontDeskNumber: { type: String, required: true },
        operationalDays: [
          {
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
        ],
        timeSlots: [
          {
            duration: {
              type: Number,
              enum: [15, 30, 45, 60],
              required: true,
            },
            startTime: { type: String, required: true }, // "09:00"
            endTime: { type: String, required: true }, // "17:00"
          },
        ],
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
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
