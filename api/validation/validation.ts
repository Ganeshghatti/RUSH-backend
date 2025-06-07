import { z } from "zod";

// User update validation schema with custom messages
export const userUpdateSchema = z.object({
  profilePic: z.string()
    .url({ message: "Profile picture must be a valid URL" })
    .optional(),
  prefix: z.enum(["Mr", "Ms", "Dr"], {
    errorMap: () => ({ message: "Prefix must be one of: Mr, Ms, or Dr" })
  }).optional(),
  firstName: z.string()
    .min(1, { message: "First name cannot be empty" })
    .max(50, { message: "First name cannot exceed 50 characters" })
    .optional(),
  lastName: z.string()
    .min(1, { message: "Last name cannot be empty" })
    .max(50, { message: "Last name cannot exceed 50 characters" })
    .optional(),
  gender: z.enum(["Male", "Female", "Other"], {
    errorMap: () => ({ message: "Gender must be one of: Male, Female, or Other" })
  }).optional(),
  dob: z.string()
    .or(z.date())
    .optional(),
  address: z.object({
    line1: z.string()
      .max(100, { message: "Address line 1 cannot exceed 100 characters" })
      .optional(),
    line2: z.string()
      .max(100, { message: "Address line 2 cannot exceed 100 characters" })
      .optional(),
    landmark: z.string()
      .max(50, { message: "Landmark cannot exceed 50 characters" })
      .optional(),
    locality: z.string()
      .max(50, { message: "Locality cannot exceed 50 characters" })
      .optional(),
    city: z.string()
      .max(50, { message: "City cannot exceed 50 characters" })
      .optional(),
    pincode: z.string()
      .regex(/^\d{6}$/, { message: "Pincode must be exactly 6 digits" })
      .optional(),
    country: z.string()
      .max(50, { message: "Country cannot exceed 50 characters" })
      .optional(),
  }).optional(),
  personalIdProof: z.object({
    type: z.enum(["Aadhar", "Passport", "DrivingLicense", "Other"], {
      errorMap: () => ({ message: "Personal ID type must be one of: Aadhar, Passport, DrivingLicense, or Other" })
    }).optional(),
    idNumber: z.string()
      .min(1, { message: "ID number cannot be empty" })
      .max(20, { message: "ID number cannot exceed 20 characters" })
      .optional(),
    image: z.string()
      .url({ message: "Personal ID proof image must be a valid URL" })
      .optional(),
    idName: z.string()
      .max(50, { message: "ID name cannot exceed 50 characters" })
      .optional(),
  }).optional(),
  addressProof: z.object({
    type: z.enum(["Passport", "RationCard", "DrivingLicense", "Other"], {
      errorMap: () => ({ message: "Address proof type must be one of: Passport, RationCard, DrivingLicense, or Other" })
    }).optional(),
    idNumber: z.string()
      .min(1, { message: "Address proof ID number cannot be empty" })
      .max(20, { message: "Address proof ID number cannot exceed 20 characters" })
      .optional(),
    image: z.string()
      .url({ message: "Address proof image must be a valid URL" })
      .optional(),
    idName: z.string()
      .max(50, { message: "Address proof ID name cannot exceed 50 characters" })
      .optional(),
  }).optional(),
  bankDetails: z.object({
    accountName: z.string()
      .max(100, { message: "Account name cannot exceed 100 characters" })
      .optional(),
    accountNumber: z.string()
      .regex(/^\d{9,18}$/, { message: "Account number must be 9-18 digits" })
      .optional(),
    ifscCode: z.string()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: "Invalid IFSC code format" })
      .optional(),
    bankName: z.string()
      .max(100, { message: "Bank name cannot exceed 100 characters" })
      .optional(),
    bankAddress: z.string()
      .max(200, { message: "Bank address cannot exceed 200 characters" })
      .optional(),
    upiId: z.string()
      .email({ message: "UPI ID must be a valid email format" })
      .optional(),
    bhimupi: z.string()
      .max(50, { message: "BHIM UPI cannot exceed 50 characters" })
      .optional(),
    upiQrImage: z.string()
      .url({ message: "UPI QR image must be a valid URL" })
      .optional(),
    upiProvider: z.string()
      .max(50, { message: "UPI provider cannot exceed 50 characters" })
      .optional(),
  }).optional(),
  taxProof: z.object({
    type: z.enum(["PAN", "Other"], {
      errorMap: () => ({ message: "Tax proof type must be either PAN or Other" })
    }).optional(),
    idNumber: z.string()
      .min(1, { message: "Tax proof ID number cannot be empty" })
      .max(20, { message: "Tax proof ID number cannot exceed 20 characters" })
      .optional(),
    image: z.string()
      .url({ message: "Tax proof image must be a valid URL" })
      .optional(),
    idName: z.string()
      .max(50, { message: "Tax proof ID name cannot exceed 50 characters" })
      .optional(),
  }).optional(),
}).strict();

// Doctor update validation schema with custom messages
export const doctorUpdateSchema = z.object({
  qualifications: z.array(z.object({
    degree: z.string()
      .max(100, { message: "Degree name cannot exceed 100 characters" })
      .optional(),
    college: z.string()
      .max(200, { message: "College name cannot exceed 200 characters" })
      .optional(),
    year: z.number()
      .int({ message: "Year must be a whole number" })
      .min(1950, { message: "Year cannot be before 1950" })
      .max(new Date().getFullYear(), { message: "Year cannot be in the future" })
      .optional(),
    degreePost: z.enum(["UG", "PG", "PHD", "graduate", "fellowship"], {
      errorMap: () => ({ message: "Degree post must be one of: UG, PG, PHD, graduate, or fellowship" })
    }).optional(),
    degreeImage: z.string()
      .url({ message: "Degree image must be a valid URL" })
      .optional(),
  }), { message: "Each qualification must be a valid object" }).optional(),
  registration: z.array(z.object({
    regNumber: z.string()
      .min(1, { message: "Registration number cannot be empty" })
      .max(50, { message: "Registration number cannot exceed 50 characters" })
      .optional(),
    council: z.string()
      .max(100, { message: "Council name cannot exceed 100 characters" })
      .optional(),
    isVerified: z.boolean({ message: "Verification status must be true or false" }).optional(),
    licenseImage: z.string()
      .url({ message: "License image must be a valid URL" })
      .optional(),
    specialization: z.string()
      .max(100, { message: "Specialization cannot exceed 100 characters" })
      .optional(),
  }), { message: "Each registration must be a valid object" }).optional(),
  specialization: z.array(
    z.string().min(1, { message: "Specialization cannot be empty" }),
    { message: "Specializations must be an array of strings" }
  ).optional(),
  signatureImage: z.string()
    .url({ message: "Signature image must be a valid URL" })
    .optional(),
  experience: z.array(z.object({
    experienceDescription: z.string()
      .max(200, { message: "Experience description cannot exceed 200 characters" })
      .optional(),
    hospitalName: z.string()
      .max(200, { message: "Hospital name cannot exceed 200 characters" })
      .optional(),
    fromYear: z.number({
      required_error: "From year is required for experience entry",
    })
      .int({ message: "From year must be a whole number" })
      .min(1950, { message: "From year cannot be before 1950" })
      .max(new Date().getFullYear(), { message: "From year cannot be in the future" }),
    toYear: z.number()
      .int({ message: "To year must be a whole number" })
      .min(1950, { message: "To year cannot be before 1950" })
      .max(new Date().getFullYear() + 1, { message: "To year cannot be more than next year" })
      .optional(),
    isCurrent: z.boolean({ message: "Current status must be true or false" }).optional(),
  }), { message: "Each experience must be a valid object" }).optional(),
  awards: z.array(z.object({
    name: z.string()
      .min(1, { message: "Award name cannot be empty" })
      .max(200, { message: "Award name cannot exceed 200 characters" })
      .optional(),
    year: z.number()
      .int({ message: "Award year must be a whole number" })
      .min(1950, { message: "Award year cannot be before 1950" })
      .max(new Date().getFullYear(), { message: "Award year cannot be in the future" })
      .optional(),
  }), { message: "Each award must be a valid object" }).optional(),
  emergencyCall: z.object({
    isActive: z.boolean({ message: "Emergency call status must be true or false" }).optional(),
    duration: z.array(z.object({
      minute: z.number()
        .int({ message: "Duration minute must be a whole number" })
        .positive({ message: "Duration minute must be a positive number" }),
      price: z.number()
        .positive({ message: "Price must be a positive number" }),
    }), { message: "Duration must be an array of valid objects" }).optional(),
    phoneNumber: z.string()
      .regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number format" })
      .optional(),
  }).optional(),
  homeVisit: z.object({
    isActive: z.boolean({ message: "Home visit status must be true or false" }).optional(),
  }).optional(),
  clinicVisit: z.object({
    isActive: z.boolean({ message: "Clinic visit status must be true or false" }).optional(),
  }).optional(),
}).strict();

// Complete profile update validation schema
export const updateProfileSchema = z.object({
  user: userUpdateSchema.optional(),
  doctor: doctorUpdateSchema.optional(),
}).refine(data => data.user || data.doctor, {
  message: "Either user profile data or doctor profile data must be provided for update",
}); 