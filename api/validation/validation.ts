import { z } from "zod";

// User update validation schema with custom messages
export const userUpdateSchema = z.object({
  profilePic: z.string()
    .optional(),
  prefix: z.string().optional(),
  firstName: z.string()
    .optional(),
  lastName: z.string()
    .optional(),
  gender: z.string().optional(),
  dob: z.string()
    .optional(),
  address: z.object({
    line1: z.string()
      .optional(),
    line2: z.string()
      .optional(),
    landmark: z.string()
      .optional(),
    locality: z.string()
      .optional(),
    city: z.string()
      .optional(),
    pincode: z.string()
      .optional(),
    country: z.string()
      .optional(),
  }).optional(),
  personalIdProof: z.object({
    type: z.string().optional(),
    idNumber: z.string()
      .optional(),
    image: z.string()
      .optional(),
    idName: z.string()
      .optional(),
  }).optional(),
  addressProof: z.object({
    type: z.string().optional(),
    idNumber: z.string()
      .optional(),
    image: z.string()
      .optional(),
    idName: z.string()
      .optional(),
  }).optional(),
  bankDetails: z.object({
    accountName: z.string()
      .optional(),
    accountNumber: z.string()
      .optional(),
    ifscCode: z.string()
      .optional(),
    bankName: z.string()
      .optional(),
    bankAddress: z.string()
      .optional(),
    upiId: z.string()
      .optional(),
    bhimupi: z.string()
      .optional(),
    upiQrImage: z.string()
      .optional(),
    upiProvider: z.string()
      .optional(),
  }).optional(),
  taxProof: z.object({
    type: z.string().optional(),
    idNumber: z.string()
      .optional(),
    image: z.string()
      .optional(),
    idName: z.string()
      .optional(),
  }).optional(),
}).strict();

// Doctor update validation schema with custom messages
export const doctorUpdateSchema = z.object({
  qualifications: z.array(z.object({
    degree: z.string()
      .optional(),
    college: z.string()
      .optional(),
    year: z.number()
      .optional(),
    degreePost: z.string().optional(),
    degreeImage: z.string()
      .optional(),
  })).optional(),
  registration: z.array(z.object({
    regNumber: z.string()
      .optional(),
    council: z.string()
      .optional(),
    isVerified: z.boolean().optional(),
    licenseImage: z.string()
      .optional(),
    specialization: z.string()
      .optional(),
  })).optional(),
  specialization: z.array(z.string()).optional(),
  signatureImage: z.string()
    .optional(),
  experience: z.array(z.object({
    experienceDescription: z.string()
      .optional(),
    hospitalName: z.string()
      .optional(),
    fromYear: z.number().nullable(),
    toYear: z.number().nullable(),
    isCurrent: z.boolean().optional(),
  })).optional(),
  awards: z.array(z.object({
    name: z.string()
      .optional(),
    year: z.number()
      .optional(),
  })).optional(),
  emergencyCall: z.object({
    isActive: z.boolean().optional(),
    duration: z.array(z.object({
      minute: z.number(),
      price: z.number()
    })).optional(),
    phoneNumber: z.string()
      .optional(),
  }).optional(),
  homeVisit: z.object({
    isActive: z.boolean().optional(),
  }).optional(),
  clinicVisit: z.object({
    isActive: z.boolean().optional(),
  }).optional(),
}).strict();

// Complete profile update validation schema
export const updateProfileSchema = z.object({
  user: userUpdateSchema.optional(),
  doctor: doctorUpdateSchema.optional(),
}).refine(data => data.user || data.doctor, {
  message: "Either user profile data or doctor profile data must be provided for update",
});

// Emergency appointment validation schema
export const createEmergencyAppointmentSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .trim(),
  description: z.string()
    .trim()
    .optional(),
  media: z.array(z.string())
    .optional(),
  location: z.string()
    .min(1, "Location is required")
    .trim()
    .optional(),
  contactNumber: z.string()
    .optional(),
  name: z.string()
    .trim()
    .optional(),
}).strict();