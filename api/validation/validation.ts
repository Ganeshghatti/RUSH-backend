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
    reports: z.array(z.string()).optional(),
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
            "covid",
          ]),
          hadCondition: z.enum(["i dont know", "i think so", "yes", "no"]),
          ageOfOnset: z.number().optional(),
          treatmentStatus: z
            .enum(["Ongoing", "Controlled", "Not Treated"])
            .optional(),
          reports: z.array(z.string()).optional(),
        })
      )
      .optional(),
    vitals: z
      .array(
        z.object({
          temperature: z.number().optional(),
          bloodPressure: z.string().optional(),
          pulseRate: z.number().optional(),
          respiratoryRate: z.number().optional(),
          bloodSugarRandom: z.number().optional(),
          bloodSugarFasting: z.number().optional(),
          bloodSugarPP: z.number().optional(),
          oxygenSaturation: z.number().optional(),
          height: z.number().positive().optional(),
          weight: z.number().positive().optional(),
          bmi: z.number().optional(),
        })
      )
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
        otcHerbalUse: z.string().optional(),
        allergiesDrug: z.array(z.string()).optional(),
        allergiesFood: z.array(z.string()).optional(),
        allergiesEnvironmental: z.array(z.string()).optional(),
        recentVaccinations: z.array(z.string()).optional(),
        tobaccoUse: z.boolean().optional(),
        alcoholUse: z.boolean().optional(),
        drugUse: z.boolean().optional(),
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
  })
  .strict();

// Clinic Schema
export const clinicSchema = z.object({
  clinicName: z.string(),
  address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    landmark: z.string().optional(),
    locality: z.string(),
    city: z.string(),
    pincode: z.string(),
    country: z.string().default("India"),
  }),
  consultationFee: z.number().positive(),
  frontDeskName: z.string(),
  frontDeskNumber: z.string(),
  availability: z.array(
    z.object({
      day: z.enum([
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ]),
      timings: z.array(
        z.object({
          startTime: z.string(),
          endTime: z.string(),
        })
      ),
    })
  ),
  isActive: z.boolean().default(true),
});
export const clinicUpdateRequestSchema = z.object({
  clinics: z.array(clinicSchema),
  isActive: z.boolean(),
});
export const clinicPatchRequestSchema = clinicUpdateRequestSchema.partial();

// clinic appointment book schema
export const clinicAppointmentBookSchema = z.object({
  doctorId: z.string(),
  clinicId: z.string(),
  slot: z.object({
    day: z.string(),
    duration: z.union([
      z.literal(15),
      z.literal(30),
      z.literal(45),
      z.literal(60),
    ]),
    time: z.object({
      start: z.string(),
      end: z.string(),
    }),
  }),
});

// Home visit appointment validation schemas
export const homeVisitAppointmentBookSchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required"),
  slot: z.object({
    day: z.string().min(1, "Day is required"),
    duration: z.union([
      z.literal(15),
      z.literal(30),
      z.literal(45),
      z.literal(60),
    ]),
    time: z.object({
      start: z.string().min(1, "Start time is required"),
      end: z.string().min(1, "End time is required"),
    }),
    history: z
      .object({
        title: z.string().optional(),
      })
      .optional(),
  }),
  patientAddress: z.object({
    line1: z.string().min(1, "Address line 1 is required"),
    line2: z.string().optional(),
    landmark: z.string().optional(),
    locality: z.string().min(1, "Locality is required"),
    city: z.string().min(1, "City is required"),
    pincode: z.string().min(1, "Pincode is required"),
    country: z.string().default("India"),
    location: z.object({
      type: z.literal("Point").default("Point"),
      coordinates: z
        .array(z.number())
        .length(2, "Coordinates must be [longitude, latitude]"),
    }),
  }),
});

export const homeVisitConfigUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  fixedPrice: z.number().min(0, "Fixed price must be non-negative").optional(),
  travelCost: z.number().min(0, "Travel cost must be non-negative").optional(),
  availability: z
    .array(
      z.object({
        day: z.enum([
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ]),
        duration: z.array(
          z.object({
            start: z.string(),
            end: z.string(),
          })
        ),
      })
    )
    .optional(),
  location: z
    .object({
      type: z.literal("Point").default("Point"),
      coordinates: z
        .array(z.number())
        .length(2, "Coordinates must be [longitude, latitude]"),
    })
    .optional(),
});

export const homeVisitAppointmentStatusUpdateSchema = z.object({
  status: z.enum(["pending", "accepted", "rejected"], {
    required_error: "Status is required",
    invalid_type_error: "Status must be pending, accepted, or rejected",
  }),
});

export const homeVisitAppointmentCompleteSchema = z.object({
  otp: z.string().min(1, "OTP is required"),
});
