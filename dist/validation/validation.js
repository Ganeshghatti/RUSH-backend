"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ratingSchemaZod = exports.prescriptionSchemaZod = exports.medicineSchemaZod = exports.homeVisitAppointmentCompleteSchema = exports.homeVisitAppointmentCancelSchema = exports.homeVisitAppointmentAcceptSchema = exports.homeVisitConfigUpdateSchema = exports.homeVisitAppointmentBookSchema = exports.otpValidationSchema = exports.clinicAppointmentBookSchema = exports.clinicPatchRequestSchema = exports.clinicUpdateRequestSchema = exports.clinicSchema = exports.updateHealthMetricsSchema = exports.updateFamilySchema = exports.addFamilySchema = exports.healthMetricsSchemaZod = exports.addHealthMetricsSchema = exports.createEmergencyAppointmentSchema = exports.updateProfileSchema = exports.doctorUpdateSchema = exports.userUpdateSchema = void 0;
const zod_1 = require("zod");
const health_metrics_model_1 = require("../models/health-metrics-model");
// User update validation schema with custom messages
exports.userUpdateSchema = zod_1.z
    .object({
    profilePic: zod_1.z.string().optional(),
    prefix: zod_1.z.string().optional(),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    gender: zod_1.z.string().optional(),
    dob: zod_1.z.string().optional(),
    address: zod_1.z
        .object({
        line1: zod_1.z.string().optional(),
        line2: zod_1.z.string().optional(),
        landmark: zod_1.z.string().optional(),
        locality: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        pincode: zod_1.z.string().optional(),
        country: zod_1.z.string().optional(),
    })
        .optional(),
    personalIdProof: zod_1.z
        .object({
        type: zod_1.z.string().optional(),
        idNumber: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(),
        idName: zod_1.z.string().optional(),
    })
        .optional(),
    addressProof: zod_1.z
        .object({
        type: zod_1.z.string().optional(),
        idNumber: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(),
        idName: zod_1.z.string().optional(),
    })
        .optional(),
    bankDetails: zod_1.z
        .object({
        accountName: zod_1.z.string().optional(),
        accountNumber: zod_1.z.string().optional(),
        ifscCode: zod_1.z.string().optional(),
        bankName: zod_1.z.string().optional(),
        bankAddress: zod_1.z.string().optional(),
        upiId: zod_1.z.string().optional(),
        bhimupi: zod_1.z.string().optional(),
        upiQrImage: zod_1.z.string().optional(),
        upiProvider: zod_1.z.string().optional(),
    })
        .optional(),
    taxProof: zod_1.z
        .object({
        type: zod_1.z.string().optional(),
        idNumber: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(),
        idName: zod_1.z.string().optional(),
    })
        .optional(),
})
    .strict();
// Doctor update validation schema with custom messages
exports.doctorUpdateSchema = zod_1.z
    .object({
    qualifications: zod_1.z
        .array(zod_1.z.object({
        degree: zod_1.z.string().optional(),
        college: zod_1.z.string().optional(),
        year: zod_1.z.number().nullable(),
        degreePost: zod_1.z.string().optional(),
        degreeImage: zod_1.z.string().optional(),
    }))
        .optional(),
    registration: zod_1.z
        .array(zod_1.z.object({
        regNumber: zod_1.z.string().optional(),
        council: zod_1.z.string().optional(),
        isVerified: zod_1.z.boolean().optional(),
        licenseImage: zod_1.z.string().optional(),
        specialization: zod_1.z.string().optional(),
    }))
        .optional(),
    specialization: zod_1.z.array(zod_1.z.string()).optional(),
    signatureImage: zod_1.z.string().optional(),
    experience: zod_1.z
        .array(zod_1.z.object({
        experienceDescription: zod_1.z.string().optional(),
        hospitalName: zod_1.z.string().optional(),
        fromYear: zod_1.z.number().nullable(),
        toYear: zod_1.z.number().nullable(),
        isCurrent: zod_1.z.boolean().optional(),
    }))
        .optional(),
    awards: zod_1.z
        .array(zod_1.z.object({
        name: zod_1.z.string().optional(),
        year: zod_1.z.number().optional(),
    }))
        .optional(),
    emergencyCall: zod_1.z
        .object({
        isActive: zod_1.z.boolean().optional(),
        duration: zod_1.z
            .array(zod_1.z.object({
            minute: zod_1.z.number(),
            price: zod_1.z.number(),
        }))
            .optional(),
        phoneNumber: zod_1.z.string().optional(),
    })
        .optional(),
    homeVisit: zod_1.z
        .object({
        isActive: zod_1.z.boolean().optional(),
    })
        .optional(),
    clinicVisit: zod_1.z
        .object({
        isActive: zod_1.z.boolean().optional(),
    })
        .optional(),
    treatableSymptoms: zod_1.z.array(zod_1.z.string()).optional(),
})
    .strict();
// Complete profile update validation schema
exports.updateProfileSchema = zod_1.z
    .object({
    user: exports.userUpdateSchema.optional(),
    doctor: exports.doctorUpdateSchema.optional(),
})
    .refine((data) => data.user || data.doctor, {
    message: "Either user profile data or doctor profile data must be provided for update",
});
// Emergency appointment validation schema
exports.createEmergencyAppointmentSchema = zod_1.z
    .object({
    title: zod_1.z.string().min(1, "Title is required").trim(),
    description: zod_1.z.string().trim().optional(),
    media: zod_1.z.array(zod_1.z.string()).optional(),
    location: zod_1.z.string().min(1, "Location is required").trim().optional(),
    contactNumber: zod_1.z.string().optional(),
    name: zod_1.z.string().trim().optional(),
})
    .strict();
// Health metrics validation schema
exports.addHealthMetricsSchema = zod_1.z
    .object({
    bloodPressure: zod_1.z.string().optional(),
    bloodGlucose: zod_1.z
        .number()
        .positive("Blood glucose must be a positive number")
        .optional(),
    weight: zod_1.z.number().positive("Weight must be a positive number").optional(),
    height: zod_1.z.number().positive("Height must be a positive number").optional(),
    bloodGroup: zod_1.z
        .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
        .optional(),
    conditions: zod_1.z.array(zod_1.z.string()).optional(),
})
    .strict();
// Health metrics validation schema
exports.healthMetricsSchemaZod = zod_1.z
    .object({
    familyMemberId: zod_1.z.string().nullable().optional(),
    medicalHistory: zod_1.z
        .array(zod_1.z.object({
        condition: zod_1.z
            .enum(Object.values(health_metrics_model_1.MedicalCondition))
            .nullable()
            .optional(),
        hadCondition: zod_1.z
            .enum(Object.values(health_metrics_model_1.HadCondition))
            .nullable()
            .optional(),
        ageOfOnset: zod_1.z.number().nullable().optional(),
        treatmentStatus: zod_1.z
            .enum(Object.values(health_metrics_model_1.TreatmentStatus))
            .nullable()
            .optional(),
        reports: zod_1.z.string().nullable().optional(),
    }))
        .nullable()
        .optional(),
    vitals: zod_1.z
        .object({
        temperature: zod_1.z.number().nullable().optional(),
        bloodPressure: zod_1.z.string().nullable().optional(),
        pulseRate: zod_1.z.number().nullable().optional(),
        respiratoryRate: zod_1.z.number().nullable().optional(),
        bloodSugarRandom: zod_1.z.number().nullable().optional(),
        bloodSugarFasting: zod_1.z.number().nullable().optional(),
        bloodSugarPP: zod_1.z.number().nullable().optional(),
        oxygenSaturation: zod_1.z.number().nullable().optional(),
        height: zod_1.z.number().nullable().optional(),
        weight: zod_1.z.number().nullable().optional(),
        bmi: zod_1.z.number().nullable().optional(),
    })
        .nullable()
        .optional(),
    femaleHealth: zod_1.z
        .object({
        lastMenstrualPeriod: zod_1.z.string().nullable().optional(),
        menstrualCycle: zod_1.z
            .enum(Object.values(health_metrics_model_1.MenstrualCycle))
            .nullable()
            .optional(),
        pregnancyStatus: zod_1.z
            .enum(Object.values(health_metrics_model_1.PregnancyStatus))
            .nullable()
            .optional(),
        contraceptiveUse: zod_1.z.string().nullable().optional(),
        pregnancies: zod_1.z.number().nullable().optional(),
        deliveries: zod_1.z.number().nullable().optional(),
        abortions: zod_1.z.number().nullable().optional(),
    })
        .nullable()
        .optional(),
    medications: zod_1.z
        .object({
        otcHerbalUse: zod_1.z.string().nullable().optional(),
        allergiesDrug: zod_1.z.array(zod_1.z.string().nullable()).nullable().optional(),
        allergiesFood: zod_1.z.array(zod_1.z.string().nullable()).nullable().optional(),
        allergiesEnvironmental: zod_1.z
            .array(zod_1.z.string().nullable())
            .nullable()
            .optional(),
        recentVaccinations: zod_1.z
            .array(zod_1.z.string().nullable())
            .nullable()
            .optional(),
        tobaccoUse: zod_1.z.boolean().nullable().optional(),
        alcoholUse: zod_1.z.boolean().nullable().optional(),
        drugUse: zod_1.z.boolean().nullable().optional(),
    })
        .nullable()
        .optional(),
    mentalHealth: zod_1.z
        .object({
        memoryIssues: zod_1.z.boolean().nullable().optional(),
        moodDiagnosis: zod_1.z.string().nullable().optional(),
        sleepPattern: zod_1.z
            .enum(Object.values(health_metrics_model_1.SleepPattern))
            .nullable()
            .optional(),
        stressLevel: zod_1.z
            .enum(Object.values(health_metrics_model_1.StressLevel))
            .nullable()
            .optional(),
    })
        .nullable()
        .optional(),
    dentalHealth: zod_1.z
        .object({
        lastDentalVisit: zod_1.z.string().nullable().optional(),
        dentalIssues: zod_1.z.array(zod_1.z.string().nullable()).nullable().optional(),
        brushingHabit: zod_1.z.string().nullable().optional(),
        oralConcerns: zod_1.z.string().nullable().optional(),
    })
        .nullable()
        .optional(),
})
    .strict();
// Family add validation schema
exports.addFamilySchema = zod_1.z
    .object({
    relationship: zod_1.z.enum([
        "Father",
        "Mother",
        "Child",
        "Spouse",
        "Sister",
        "Brother",
        "Father-in-law",
        "Mother-in-law",
        "Other",
    ], { required_error: "Relationship is required" }),
    basicDetails: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Name is required" }),
        gender: zod_1.z.enum(["Male", "Female", "Other"], {
            required_error: "Gender is required",
        }),
        age: zod_1.z
            .number({ required_error: "Age is required" })
            .min(0, "Age cannot be negative"),
        email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
        mobile: zod_1.z.string().optional(),
    }),
    address: zod_1.z
        .object({
        line1: zod_1.z.string().optional(),
        line2: zod_1.z.string().optional(),
        locality: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        pincode: zod_1.z.string().optional(),
        country: zod_1.z.string().optional(),
    })
        .optional(),
    idProof: zod_1.z
        .object({
        idType: zod_1.z.string().optional(),
        idNumber: zod_1.z.string().optional(),
        idImage: zod_1.z.string().optional(),
    })
        .optional(),
    insurance: zod_1.z
        .array(zod_1.z.object({
        policyNumber: zod_1.z.string().optional(),
        provider: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(),
    }))
        .optional(),
})
    .strict();
// Family update validation schema
exports.updateFamilySchema = zod_1.z
    .object({
    relationship: zod_1.z
        .enum([
        "Father",
        "Mother",
        "Child",
        "Spouse",
        "Sister",
        "Brother",
        "Father-in-law",
        "Mother-in-law",
        "Other",
    ])
        .optional(),
    basicDetails: zod_1.z
        .object({
        name: zod_1.z.string().optional(),
        gender: zod_1.z.enum(["Male", "Female", "Other"]).optional(),
        age: zod_1.z.number().min(0, "Age cannot be negative").optional(),
        email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
        mobile: zod_1.z.string().optional(),
    })
        .optional(),
    address: zod_1.z
        .object({
        line1: zod_1.z.string().optional(),
        line2: zod_1.z.string().optional(),
        locality: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        pincode: zod_1.z.string().optional(),
        country: zod_1.z.string().optional(),
    })
        .optional(),
    idProof: zod_1.z
        .object({
        idType: zod_1.z.string().optional(),
        idNumber: zod_1.z.string().optional(),
        idImage: zod_1.z.string().optional(),
    })
        .optional(),
    insurance: zod_1.z
        .array(zod_1.z.object({
        policyNumber: zod_1.z.string().optional(),
        provider: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(),
    }))
        .optional(),
})
    .strict();
// Health metrics update validation schema
exports.updateHealthMetricsSchema = zod_1.z
    .object({
    reports: zod_1.z.array(zod_1.z.string()).optional(),
    medicalHistory: zod_1.z
        .array(zod_1.z.object({
        condition: zod_1.z.enum([
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
        hadCondition: zod_1.z.enum(["i dont know", "i think so", "yes", "no"]),
        ageOfOnset: zod_1.z.number().optional(),
        treatmentStatus: zod_1.z
            .enum(["Ongoing", "Controlled", "Not Treated"])
            .optional(),
        reports: zod_1.z.array(zod_1.z.string()).optional(),
    }))
        .optional(),
    vitals: zod_1.z
        .array(zod_1.z.object({
        temperature: zod_1.z.number().optional(),
        bloodPressure: zod_1.z.string().optional(),
        pulseRate: zod_1.z.number().optional(),
        respiratoryRate: zod_1.z.number().optional(),
        bloodSugarRandom: zod_1.z.number().optional(),
        bloodSugarFasting: zod_1.z.number().optional(),
        bloodSugarPP: zod_1.z.number().optional(),
        oxygenSaturation: zod_1.z.number().optional(),
        height: zod_1.z.number().positive().optional(),
        weight: zod_1.z.number().positive().optional(),
        bmi: zod_1.z.number().optional(),
    }))
        .optional(),
    femaleHealth: zod_1.z
        .object({
        lastMenstrualPeriod: zod_1.z.string().optional(),
        menstrualCycle: zod_1.z
            .enum(["Regular", "Irregular", "Menopause"])
            .optional(),
        pregnancyStatus: zod_1.z
            .enum(["Pregnant", "Not Pregnant", "Trying"])
            .optional(),
        contraceptiveUse: zod_1.z.string().optional(),
        pregnancies: zod_1.z.number().optional(),
        deliveries: zod_1.z.number().optional(),
        abortions: zod_1.z.number().optional(),
    })
        .optional(),
    medications: zod_1.z
        .object({
        otcHerbalUse: zod_1.z.string().optional(),
        allergiesDrug: zod_1.z.array(zod_1.z.string()).optional(),
        allergiesFood: zod_1.z.array(zod_1.z.string()).optional(),
        allergiesEnvironmental: zod_1.z.array(zod_1.z.string()).optional(),
        recentVaccinations: zod_1.z.array(zod_1.z.string()).optional(),
        tobaccoUse: zod_1.z.boolean().optional(),
        alcoholUse: zod_1.z.boolean().optional(),
        drugUse: zod_1.z.boolean().optional(),
    })
        .optional(),
    mentalHealth: zod_1.z
        .object({
        memoryIssues: zod_1.z.boolean().optional(),
        moodDiagnosis: zod_1.z.string().optional(),
        sleepPattern: zod_1.z.enum(["Normal", "Insomnia", "Oversleeping"]).optional(),
        stressLevel: zod_1.z.enum(["None", "Mild", "Moderate", "Severe"]).optional(),
    })
        .optional(),
    dentalHealth: zod_1.z
        .object({
        lastDentalVisit: zod_1.z.string().optional(),
        dentalIssues: zod_1.z.array(zod_1.z.string()).optional(),
        brushingHabit: zod_1.z.string().optional(),
        oralConcerns: zod_1.z.string().optional(),
    })
        .optional(),
})
    .strict();
// Clinic Schema
exports.clinicSchema = zod_1.z.object({
    clinicName: zod_1.z.string(),
    address: zod_1.z.object({
        line1: zod_1.z.string(),
        line2: zod_1.z.string().optional(),
        landmark: zod_1.z.string().optional(),
        locality: zod_1.z.string(),
        city: zod_1.z.string(),
        pincode: zod_1.z.string(),
        country: zod_1.z.string().default("India"),
    }),
    consultationFee: zod_1.z.number().positive(),
    frontDeskName: zod_1.z.string(),
    frontDeskNumber: zod_1.z.string(),
    availability: zod_1.z.array(zod_1.z.object({
        day: zod_1.z.enum([
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ]),
        timings: zod_1.z.array(zod_1.z.object({
            startTime: zod_1.z.string(),
            endTime: zod_1.z.string(),
        })),
    })),
    isActive: zod_1.z.boolean().default(true),
});
exports.clinicUpdateRequestSchema = zod_1.z.object({
    clinics: zod_1.z.array(exports.clinicSchema),
    isActive: zod_1.z.boolean(),
});
exports.clinicPatchRequestSchema = exports.clinicUpdateRequestSchema.partial();
// clinic appointment book schema
exports.clinicAppointmentBookSchema = zod_1.z.object({
    doctorId: zod_1.z.string(),
    clinicId: zod_1.z.string(),
    slot: zod_1.z.object({
        day: zod_1.z.string(),
        duration: zod_1.z.union([
            zod_1.z.literal(15),
            zod_1.z.literal(30),
            zod_1.z.literal(45),
            zod_1.z.literal(60),
        ]),
        time: zod_1.z.object({
            start: zod_1.z.string(),
            end: zod_1.z.string(),
        }),
    }),
});
// otp validation schema
exports.otpValidationSchema = zod_1.z.object({
    appointmentId: zod_1.z.string(),
    otp: zod_1.z.string(),
});
// Home visit appointment validation schemas
exports.homeVisitAppointmentBookSchema = zod_1.z.object({
    doctorId: zod_1.z.string().min(1, "Doctor ID is required"),
    slot: zod_1.z.object({
        day: zod_1.z.string().min(1, "Day is required"),
        duration: zod_1.z.union([
            zod_1.z.literal(15),
            zod_1.z.literal(30),
            zod_1.z.literal(45),
            zod_1.z.literal(60),
        ]),
        time: zod_1.z.object({
            start: zod_1.z.string().min(1, "Start time is required"),
            end: zod_1.z.string().min(1, "End time is required"),
        }),
        history: zod_1.z
            .object({
            title: zod_1.z.string().optional(),
        })
            .optional(),
    }),
    patientAddress: zod_1.z.object({
        line1: zod_1.z.string().min(1, "Address line 1 is required"),
        line2: zod_1.z.string().optional(),
        landmark: zod_1.z.string().optional(),
        locality: zod_1.z.string().min(1, "Locality is required"),
        city: zod_1.z.string().min(1, "City is required"),
        pincode: zod_1.z.string().min(1, "Pincode is required"),
        country: zod_1.z.string().default("India"),
        // location: z.object({
        //   type: z.literal("Point").default("Point"),
        //   coordinates: z
        //     .array(z.number())
        //     .length(2, "Coordinates must be [longitude, latitude]"),
        // }),
    }),
});
exports.homeVisitConfigUpdateSchema = zod_1.z.object({
    isActive: zod_1.z.boolean().optional(),
    fixedPrice: zod_1.z.number().min(0, "Fixed price must be non-negative").optional(),
    availability: zod_1.z
        .array(zod_1.z.object({
        day: zod_1.z.enum([
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ]),
        duration: zod_1.z.array(zod_1.z.object({
            start: zod_1.z.string(),
            end: zod_1.z.string(),
        })),
    }))
        .optional(),
    // location: z
    //   .object({
    //     type: z.literal("Point").default("Point"),
    //     coordinates: z
    //       .array(z.number())
    //       .length(2, "Coordinates must be [longitude, latitude]"),
    //   })
    //   .optional(),
});
exports.homeVisitAppointmentAcceptSchema = zod_1.z.object({
    travelCost: zod_1.z.number().min(0, "Travel cost must be non-negative"),
});
exports.homeVisitAppointmentCancelSchema = zod_1.z.object({
    reason: zod_1.z.string().optional(),
});
exports.homeVisitAppointmentCompleteSchema = zod_1.z.object({
    otp: zod_1.z.string().min(1, "OTP is required"),
});
exports.medicineSchemaZod = zod_1.z.object({
    type: zod_1.z.string({ required_error: "Medicine type is required" }),
    name: zod_1.z.string({ required_error: "Medicine name is required" }),
    mg: zod_1.z.string().optional(),
    morning: zod_1.z.number().default(0),
    noon: zod_1.z.number().default(0),
    evening: zod_1.z.number().default(0),
    night: zod_1.z.number().default(0),
    durationDays: zod_1.z.coerce.number(),
});
exports.prescriptionSchemaZod = zod_1.z.object({
    appointmentId: zod_1.z.string({ required_error: "Appointment ID is required" }),
    appointmentTypeRef: zod_1.z.enum([
        "OnlineAppointment",
        "ClinicAppointment",
        "HomeVisitAppointment",
        "EmergencyAppointment",
    ], { required_error: "Appointment type reference is required" }),
    patientId: zod_1.z.string({ required_error: "Patient ID is required" }),
    symptoms: zod_1.z.string().optional(),
    medicines: zod_1.z.array(exports.medicineSchemaZod).optional(),
    notes: zod_1.z.string().optional(),
    labTest: zod_1.z.string().optional(),
    nextAppointmentDate: zod_1.z.coerce.date(),
});
exports.ratingSchemaZod = zod_1.z.object({
    appointmentId: zod_1.z.string().min(1, "Appointment ID is required"),
    appointmentTypeRef: zod_1.z.enum([
        "OnlineAppointment",
        "ClinicAppointment",
        "HomeVisitAppointment",
        "EmergencyAppointment",
    ]),
    doctorId: zod_1.z.string().min(1, "Doctor ID is required"),
    rating: zod_1.z
        .number({
        required_error: "Rating is required",
        invalid_type_error: "Rating must be a number",
    })
        .min(1, "Rating must be at least 1")
        .max(5, "Rating cannot exceed 5"),
    review: zod_1.z.string().trim().optional(),
});
