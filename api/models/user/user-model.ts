import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: [{ type: String, enum: ["doctor", "patient", "admin"] }],
    roleRefs: {
      doctor: { type: Schema.Types.ObjectId, ref: "Doctor" },
      patient: { type: Schema.Types.ObjectId, ref: "Patient" },
      // in future: pharmacist, therapist, etc.
    },
    profilePic: { type: String },
    prefix: { type: String, enum: ["Mr", "Ms", "Dr"] },
    firstName: { type: String },
    lastName: { type: String },
    countryCode: { type: String, required: true },
    phone: { type: String, required: true },
    phoneVerified: { type: Boolean, default: false },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    dob: { type: Date },
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
      },
      idNumber: { type: String },
      image: { type: String },
      idName: { type: String }, // for other only
    },
    addressProof: {
      type: {
        type: String,
        enum: ["Passport", "RationCard", "DrivingLicense", "Other"],
      },
      idNumber: { type: String },
      image: { type: String },
      idName: { type: String }, // for other only
    },
    bankDetails: {
      accountName: { type: String },
      accountNumber: { type: String, unique: true, sparse: true },
      ifscCode: { type: String },
      bankName: { type: String },
      bankAddress: { type: String },
      upiId: { type: String },
      upiQrImage: { type: String },
      upiProvider: { type: String },
    },
    taxProof: {
      type: { type: String, enum: ["PAN", "Other"] },
      idNumber: { type: String }, 
      image: { type: String },
      idName: { type: String }, 
    },
    isDocumentVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  }
);

const User = mongoose.model("User", userSchema);

export { User }; // Named export
export default User; // Default export
