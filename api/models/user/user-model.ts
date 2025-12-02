import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  roles: [{ type: String, enum: ["doctor", "patient", "admin"] }],
  roleRefs: {
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor" },
    patient: { type: Schema.Types.ObjectId, ref: "Patient" },
    admin: { type: Schema.Types.ObjectId, ref: "Admin" },
    // in future: pharmacist, therapist, etc.
  },
  profilePic: {
    type: String,
    default:
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
  },
  prefix: {
    type: String,
    enum: ["Mr", "Ms", "Dr"],
    default: "Mr",
    required: true,
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  countryCode: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  phoneVerified: { type: Boolean, default: false },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    default: "Male",
    required: true,
  },
  dob: { type: Date },
  wallet: { type: Number, default: 0 },
  frozenAmount: { type: Number, default: 0 }, // Amount frozen for pending appointments
  transaction_history: [
    {
      type: {
        type: String,
        enum: ["credit", "debit"],
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending",
      },
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      description: { type: String },
      transactionId: { type: String },
      referenceId: { type: String },
      orderId: { type: String },
      // Store a snapshot of bank details used for this transaction
      bankDetailsSnapshot: {
        accountName: { type: String },
        accountNumber: { type: String },
        ifscCode: { type: String },
        bankName: { type: String },
        bankAddress: { type: String },
        upiId: { type: String },
      },
    },
  ],
  // Razorpay fields
  rzpayContactId: { type: String }, // stores Razorpay contact_id
  rzpayFundAccountId: { type: String }, // stores Razorpay fund_account_id
  address: {
    line1: { type: String },
    line2: { type: String },
    landmark: { type: String },
    locality: { type: String },
    city: { type: String },
    pincode: { type: String },
    country: { type: String },
  },
  personalIdProof: {
    type: {
      type: String,
      enum: ["Aadhar", "Passport", "DrivingLicense", "Other"],
      default: "Aadhar",
    },
    idNumber: { type: String },
    image: { type: String },
    idName: { type: String }, // for other only
  },
  addressProof: {
    type: {
      type: String,
      enum: ["Passport", "RationCard", "DrivingLicense", "Other"],
      default: "RationCard",
    },
    idNumber: { type: String },
    image: { type: String },
    idName: { type: String }, // for other only
  },
  bankDetails: {
    accountName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    bankName: { type: String },
    bankAddress: { type: String },
    upiId: { type: String },
    bhimupi: { type: String },
    upiQrImage: { type: String },
    upiProvider: { type: String },
  },
  taxProof: {
    type: { type: String, enum: ["PAN", "Other"], default: "PAN" },
    idNumber: { type: String },
    image: { type: String },
    idName: { type: String },
  },
  insuranceDetails: [
    {
      providerName: { type: String },
      providerPhone: { type: String },
      imageProof: { type: String },
    },
  ],
  isDocumentVerified: { type: Boolean, default: false },
  fcmToken: {
    type: String,
    default: null,
  },

  deviceType: {
    type: String,
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
});

userSchema.virtual("profilePicUrl").get(function () {
  if (this.profilePic) return this.profilePic;
  const name = encodeURIComponent(this.firstName + " " + this.lastName);
  return `https://ui-avatars.com/api/?name=${name}&background=random&size=128`;
});

// Instance method to get available wallet balance (excluding frozen amount)
userSchema.methods.getAvailableBalance = function () {
  return this.wallet - (this.frozenAmount || 0);
};

// Instance method to freeze amount from wallet
userSchema.methods.freezeAmount = function (amount: number) {
  const availableBalance = this.getAvailableBalance();
  if (availableBalance >= amount) {
    this.frozenAmount = (this.frozenAmount || 0) + amount;
    return true;
  }
  return false;
};

// Instance method to unfreeze amount (return to available balance)
userSchema.methods.unfreezeAmount = function (amount: number) {
  this.frozenAmount = Math.max(0, (this.frozenAmount || 0) - amount);
};

// Instance method to deduct from frozen amount (complete payment)
userSchema.methods.deductFrozenAmount = function (amount: number) {
  const frozenAmount = this.frozenAmount || 0;
  if (frozenAmount >= amount) {
    this.frozenAmount = frozenAmount - amount;
    this.wallet -= amount;
    return true;
  }
  return false;
};

const User = mongoose.model("User", userSchema);

export { User }; // Named export
export default User; // Default export
