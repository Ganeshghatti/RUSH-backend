import { z } from "zod";

// User update validation schema with custom messages
export const userUpdateSchema = z
  .object({
    profilePic: z.string().optional(),
    prefix: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    gender: z.string().optional(),
    dob: z.string().optional(),
    address: z
      .object({
        line1: z.string().optional(),
        line2: z.string().optional(),
        landmark: z.string().optional(),
        locality: z.string().optional(),
        city: z.string().optional(),
        pincode: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
    personalIdProof: z
      .object({
        type: z.string().optional(),
        idNumber: z.string().optional(),
        image: z.string().optional(),
        idName: z.string().optional(),
      })
      .optional(),
    addressProof: z
      .object({
        type: z.string().optional(),
        idNumber: z.string().optional(),
        image: z.string().optional(),
        idName: z.string().optional(),
      })
      .optional(),
    bankDetails: z
      .object({
        accountName: z.string().optional(),
        accountNumber: z.string().optional(),
        ifscCode: z.string().optional(),
        bankName: z.string().optional(),
        bankAddress: z.string().optional(),
        upiId: z.string().optional(),
        bhimupi: z.string().optional(),
        upiQrImage: z.string().optional(),
        upiProvider: z.string().optional(),
      })
      .optional(),
    taxProof: z
      .object({
        type: z.string().optional(),
        idNumber: z.string().optional(),
        image: z.string().optional(),
        idName: z.string().optional(),
      })
      .optional(),
  })
  .strict();

// Doctor update validation schema with custom messages
export const doctorUpdateSchema = z
  .object({
    qualifications: z
      .array(
        z.object({
          degree: z.string().optional(),
          college: z.string().optional(),
          year: z.number().nullable(),
          degreePost: z.string().optional(),
          degreeImage: z.string().optional(),
        })
      )
      .optional(),
    registration: z
      .array(
        z.object({
          regNumber: z.string().optional(),
          council: z.string().optional(),
          isVerified: z.boolean().optional(),
          licenseImage: z.string().optional(),
          specialization: z.string().optional(),
        })
      )
      .optional(),
    specialization: z.array(z.string()).optional(),
    signatureImage: z.string().optional(),
    experience: z
      .array(
        z.object({
          experienceDescription: z.string().optional(),
          hospitalName: z.string().optional(),
          fromYear: z.number().nullable(),
          toYear: z.number().nullable(),
          isCurrent: z.boolean().optional(),
        })
      )
      .optional(),
    awards: z
      .array(
        z.object({
          name: z.string().optional(),
          year: z.number().optional(),
        })
      )
      .optional(),
    emergencyCall: z
      .object({
        isActive: z.boolean().optional(),
        duration: z
          .array(
            z.object({
              minute: z.number(),
              price: z.number(),
            })
          )
          .optional(),
        phoneNumber: z.string().optional(),
      })
      .optional(),
    homeVisit: z
      .object({
        isActive: z.boolean().optional(),
      })
      .optional(),
    clinicVisit: z
      .object({
        isActive: z.boolean().optional(),
      })
      .optional(),
  })
  .strict();

// Complete profile update validation schema
export const updateProfileSchema = z
  .object({
    user: userUpdateSchema.optional(),
    doctor: doctorUpdateSchema.optional(),
  })
  .refine((data) => data.user || data.doctor, {
    message:
      "Either user profile data or doctor profile data must be provided for update",
  });

// Emergency appointment validation schema
export const createEmergencyAppointmentSchema = z
  .object({
    title: z.string().min(1, "Title is required").trim(),
    description: z.string().trim().optional(),
    media: z.array(z.string()).optional(),
    location: z.string().min(1, "Location is required").trim().optional(),
    contactNumber: z.string().optional(),
    name: z.string().trim().optional(),
  })
  .strict();

// Health metrics validation schema
export const addHealthMetricsSchema = z
  .object({
    bloodPressure: z.string().optional(),
    bloodGlucose: z
      .number()
      .positive("Blood glucose must be a positive number")
      .optional(),
    weight: z.number().positive("Weight must be a positive number").optional(),
    height: z.number().positive("Height must be a positive number").optional(),
    bloodGroup: z
      .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
      .optional(),
    conditions: z.array(z.string()).optional(),
  })
  .strict();

// Family add validation schema
export const addFamilySchema = z
  .object({
    relationship: z.enum([
      "Father",
      "Mother",
      "Child",
      "Sister",
      "Brother",
      "Father-in-law",
      "Mother-in-law",
      "Other",
    ]),
    profilePic: z.string().optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    age: z.number().optional(),
    email: z.string().email().optional(),
    address: z
      .object({
        line1: z.string().optional(),
        line2: z.string().optional(),
        locality: z.string().optional(),
        city: z.string().optional(),
        pincode: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
    mobile: z.string().optional(),
    idNumber: z.string().optional(),
    idImage: z.string().optional(),
    insurance: z
      .object({
        policyNumber: z.string().optional(),
        provider: z.string().optional(),
        image: z.string().optional(),
      })
      .optional(),
    healthMetrics: z
      .object({
        diabetes: z.boolean().optional(),
        hypertension: z.boolean().optional(),
        heartDisease: z.boolean().optional(),
        stroke: z.boolean().optional(),
        cancer: z.array(z.string()).optional(),
        thyroid: z.boolean().optional(),
        mentalIllness: z.boolean().optional(),
        geneticDisorders: z.boolean().optional(),
        Other: z.string().optional(),
      })
      .optional(),
  })
  .strict();

// Family update validation schema
export const updateFamilySchema = z
  .object({
    relationship: z
      .enum([
        "Father",
        "Mother",
        "Child",
        "Sister",
        "Brother",
        "Father-in-law",
        "Mother-in-law",
        "Other",
      ])
      .optional(),
    profilePic: z.string().optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    age: z.number().optional(),
    email: z.string().email().optional(),
    address: z
      .object({
        line1: z.string().optional(),
        line2: z.string().optional(),
        locality: z.string().optional(),
        city: z.string().optional(),
        pincode: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
    mobile: z.string().optional(),
    idNumber: z.string().optional(),
    idImage: z.string().optional(),
    insurance: z
      .object({
        policyNumber: z.string().optional(),
        provider: z.string().optional(),
        image: z.string().optional(),
      })
      .optional(),
    healthMetrics: z
      .object({
        diabetes: z.boolean().optional(),
        hypertension: z.boolean().optional(),
        heartDisease: z.boolean().optional(),
        stroke: z.boolean().optional(),
        cancer: z.array(z.string()).optional(),
        thyroid: z.boolean().optional(),
        mentalIllness: z.boolean().optional(),
        geneticDisorders: z.boolean().optional(),
        Other: z.string().optional(),
      })
      .optional(),
  })
  .strict();

// Health metrics update validation schema
export const updateHealthMetricsSchema = z
  .object({
    medicalHistory: z
      .array(
        z.object({
          condition: z.enum([
            "diabetes",
            "hypertension",
            "coronaryArteryDisease",
            "congestiveHeartFailure",
            "stroke",
            "asthma",
            "copd",
            "chronicBronchitis",
            "thyroidDisorder",
            "kidneyDisease",
            "liverDisease",
            "cancer",
            "tuberculosis",
            "hiv",
            "std",
            "epilepsy",
            "depressionAnxiety",
            "bipolarSchizophrenia",
            "autoimmuneDisease",
            "bloodDisorders",
            "bleedingDisorders",
            "migraines",
            "giDisorders",
            "gerd",
            "jointDisorders",
            "skinDisorders",
            "visionProblems",
            "hearingLoss",
            "sleepDisorders",
          ]),
          hasCondition: z.boolean().optional(),
          ageOfOnset: z.number().optional(),
          treatmentStatus: z
            .enum(["Ongoing", "Controlled", "Resolved", "Not Treated"])
            .optional(),
          reports: z.array(z.string()).optional(),
        })
      )
      .optional(),
    vitals: z
      .object({
        temperature: z.number().optional(),
        bloodPressure: z.string().optional(),
        pulseRate: z.number().optional(),
        respiratoryRate: z.number().optional(),
        bloodSugarRandom: z.number().optional(),
        bloodSugarFasting: z.number().optional(),
        bloodSugarPP: z.number().optional(),
        oxygenSaturation: z.number().optional(),
        painScale: z.number().min(0).max(10).optional(),
        height: z.number().positive().optional(),
        weight: z.number().positive().optional(),
        bmi: z.number().optional(),
      })
      .optional(),
    femaleHealth: z
      .object({
        lastMenstrualPeriod: z.string().optional(),
        menstrualCycle: z
          .enum(["Regular", "Irregular", "Menopause"])
          .optional(),
        pregnancyStatus: z
          .enum(["Pregnant", "Not Pregnant", "Trying"])
          .optional(),
        contraceptiveUse: z.string().optional(),
        pregnancies: z.number().optional(),
        deliveries: z.number().optional(),
        abortions: z.number().optional(),
      })
      .optional(),
    medications: z
      .object({
        currentMedications: z.string().optional(),
        otcHerbalUse: z.string().optional(),
        allergiesDrug: z.array(z.string()).optional(),
        allergiesFood: z.array(z.string()).optional(),
        allergiesEnvironmental: z.array(z.string()).optional(),
        pastSurgeries: z.array(z.string()).optional(),
        hospitalizations: z.array(z.string()).optional(),
        recentVaccinations: z.array(z.string()).optional(),
        recentTravelHistory: z.array(z.string()).optional(),
        tobaccoUse: z.boolean().optional(),
        alcoholUse: z.boolean().optional(),
        drugUse: z.boolean().optional(),
      })
      .optional(),
    infections: z
      .object({
        covidStatus: z
          .enum(["Never infected", "Recovered", "Vaccinated", "Boosted"])
          .optional(),
        tbExposure: z.boolean().optional(),
        hivHepatitisRisk: z.boolean().optional(),
        contagiousExposure: z.boolean().optional(),
        occupationalRisk: z.boolean().optional(),
      })
      .optional(),
    mentalHealth: z
      .object({
        memoryIssues: z.boolean().optional(),
        moodDiagnosis: z.string().optional(),
        sleepPattern: z.enum(["Normal", "Insomnia", "Oversleeping"]).optional(),
        stressLevel: z.enum(["None", "Mild", "Moderate", "Severe"]).optional(),
      })
      .optional(),
    dentalHealth: z
      .object({
        lastDentalVisit: z.string().optional(),
        dentalIssues: z.array(z.string()).optional(),
        brushingHabit: z.string().optional(),
        oralConcerns: z.string().optional(),
      })
      .optional(),
    currentSymptoms: z.array(z.string()).optional(),
    otherSymptomsText: z.string().optional(),
  })
  .strict();

// Clinic validation schemas
export const clinicCreateSchema = z
  .object({
    clinicName: z
      .string()
      .min(1, "Clinic name is required")
      .max(100, "Clinic name must be less than 100 characters"),
    address: z.object({
      line1: z
        .string()
        .min(1, "Address line 1 is required")
        .max(200, "Address line 1 must be less than 200 characters"),
      line2: z
        .string()
        .max(200, "Address line 2 must be less than 200 characters")
        .optional(),
      landmark: z
        .string()
        .max(100, "Landmark must be less than 100 characters")
        .optional(),
      locality: z
        .string()
        .min(1, "Locality is required")
        .max(100, "Locality must be less than 100 characters"),
      city: z
        .string()
        .min(1, "City is required")
        .max(50, "City must be less than 50 characters"),
      pincode: z
        .string()
        .min(6, "Pincode must be at least 6 characters")
        .max(10, "Pincode must be less than 10 characters"),
      country: z
        .string()
        .min(1, "Country is required")
        .max(50, "Country must be less than 50 characters")
        .default("India"),
    }),
    consultationFee: z
      .number()
      .min(0, "Consultation fee must be a positive number")
      .max(10000, "Consultation fee must be less than 10,000"),
    frontDeskNumber: z
      .string()
      .min(10, "Front desk number must be at least 10 digits")
      .max(15, "Front desk number must be less than 15 digits")
      .regex(/^\+?[1-9]\d{9,14}$/, "Invalid front desk number format"),
    operationalDays: z
      .array(
        z.enum([
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ])
      )
      .min(1, "At least one operational day is required")
      .max(7, "Maximum 7 operational days allowed"),
    timeSlots: z
      .array(
        z.object({
          duration: z.number().refine((val) => [15, 30, 45, 60].includes(val), {
            message: "Duration must be 15, 30, 45, or 60 minutes",
          }),
          startTime: z
            .string()
            .regex(
              /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
              "Start time must be in HH:MM format"
            ),
          endTime: z
            .string()
            .regex(
              /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
              "End time must be in HH:MM format"
            ),
        })
      )
      .min(1, "At least one time slot is required"),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const clinicUpdateSchema = clinicCreateSchema.partial().strict();

// Clinic appointment booking validation
export const clinicAppointmentBookSchema = z
  .object({
    doctorId: z.string().min(1, "Doctor ID is required"),
    clinicId: z.string().min(1, "Clinic ID is required"),
    slot: z.object({
      day: z.string().min(1, "Appointment day is required"),
      duration: z.number().refine((val) => [15, 30, 45, 60].includes(val), {
        message: "Duration must be 15, 30, 45, or 60 minutes",
      }),
      time: z.object({
        start: z.string().min(1, "Start time is required"),
        end: z.string().min(1, "End time is required"),
      }),
    }),
  })
  .strict();

// OTP validation schema
export const otpValidationSchema = z
  .object({
    appointmentId: z.string().min(1, "Appointment ID is required"),
    otp: z
      .string()
      .length(6, "OTP must be exactly 6 characters")
      .regex(
        /^[A-Z0-9]{6}$/,
        "OTP must contain only uppercase letters and numbers"
      ),
  })
  .strict();
