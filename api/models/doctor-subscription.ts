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
    doctor_type: {
      type: String,
    },
    doctor_type_description: {
      type: String,
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
      enum: [
        "1 month",
        "3 months",
        "1 year",
        "2 years",
        "20 years",
        "15 years",
        "10 years",
        "5 years",
        "40 years",
        "lifetime",
      ],
    },
    advertisement_cost: {
      type: Number,
      default: 0,
    },

    platformFeeOnline: {
      min15: {
        type: {
          type: String,
          enum: ["Number", "Percentage"],
          required: true,
        },
        figure: {
          type: Number,
          required: true,
          min: [0, "Platform fee must be at least 0%"],
        },
      },
      min30: {
        type: {
          type: String,
          enum: ["Number", "Percentage"],
          required: true,
        },
        figure: {
          type: Number,
          required: true,
          min: [0, "Platform fee must be at least 0%"],
        },
      },
      min60: {
        type: {
          type: String,
          enum: ["Number", "Percentage"],
          required: true,
        },
        figure: {
          type: Number,
          required: true,
          min: [0, "Platform fee must be at least 0%"],
        },
      },
    },
    opsExpenseOnline: {
      min15: {
        type: {
          type: String,
          enum: ["Number", "Percentage"],
          required: true,
        },
        figure: {
          type: Number,
          required: true,
          min: [0, "Operational expense must be a positive number"],
        },
      },
      min30: {
        type: {
          type: String,
          enum: ["Number", "Percentage"],
          required: true,
        },
        figure: {
          type: Number,
          required: true,
          min: [0, "Operational expense must be a positive number"],
        },
      },
      min60: {
        type: {
          type: String,
          enum: ["Number", "Percentage"],
          required: true,
        },
        figure: {
          type: Number,
          required: true,
          min: [0, "Operational expense must be a positive number"],
        },
      },
    },
    platformFeeClinic: {
      type: {
        type: String,
        enum: ["Number", "Percentage"],
        required: true,
      },
      figure: {
        type: Number,
        required: true,
        min: [0, "Platform fee must be at least 0%"],
      },
    },
    opsExpenseClinic: {
      type: {
        type: String,
        enum: ["Number", "Percentage"],
        required: true,
      },
      figure: {
        type: Number,
        required: true,
        min: [0, "Operational expense must be a positive number"],
      },
    },
    platformFeeHomeVisit: {
      type: {
        type: String,
        enum: ["Number", "Percentage"],
        required: true,
      },
      figure: {
        type: Number,
        required: true,
        min: [0, "Platform fee must be at least 0%"],
      },
    },
    opsExpenseHomeVisit: {
      type: {
        type: String,
        enum: ["Number", "Percentage"],
        required: true,
      },
      figure: {
        type: Number,
        required: true,
        min: [0, "Operational expense must be a positive number"],
      },
    },
    platformFeeEmergency: {
      type: {
        type: String,
        enum: ["Number", "Percentage"],
        required: true,
      },
      figure: {
        type: Number,
        required: true,
        min: [0, "Platform fee must be at least 0%"],
      },
    },
    opsExpenseEmergency: {
      type: {
        type: String,
        enum: ["Number", "Percentage"],
        required: true,
      },
      figure: {
        type: Number,
        required: true,
        min: [0, "Operational expense must be a positive number"],
      },
    },
  },
  {
    timestamps: true,
  }
);

const DoctorSubscription = mongoose.model(
  "DoctorSubscription",
  DoctorSubscriptionSchema
);

export default DoctorSubscription;
