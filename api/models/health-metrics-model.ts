import mongoose from "mongoose";
const { Schema } = mongoose;

const TreatmentStatus = {
  ONGOING: "Ongoing",
  CONTROLLED: "Controlled",
  NOT_TREATED: "Not Treated",
} as const;

const MedicalCondition = {
  DIABETES: "diabetes",
  HYPERTENSION: "hypertension",
  CORONARY_ARTERY_DISEASE: "coronaryArteryDisease",
  CONGESTIVE_HEART_FAILURE: "congestiveHeartFailure",
  STROKE: "stroke",
  ASTHMA: "asthma",
  COPD: "copd",
  CHRONIC_BRONCHITIS: "chronicBronchitis",
  THYROID_DISORDER: "thyroidDisorder",
  KIDNEY_DISEASE: "kidneyDisease",
  LIVER_DISEASE: "liverDisease",
  CANCER: "cancer",
  TUBERCULOSIS: "tuberculosis",
  HIV: "hiv",
  STD: "std",
  EPILEPSY: "epilepsy",
  DEPRESSION_ANXIETY: "depressionAnxiety",
  BIPOLAR_SCHIZOPHRENIA: "bipolarSchizophrenia",
  AUTOIMMUNE_DISEASE: "autoimmuneDisease",
  BLOOD_DISORDERS: "bloodDisorders",
  BLEEDING_DISORDERS: "bleedingDisorders",
  MIGRAINES: "migraines",
  GI_DISORDERS: "giDisorders",
  GERD: "gerd",
  JOINT_DISORDERS: "jointDisorders",
  SKIN_DISORDERS: "skinDisorders",
  VISION_PROBLEMS: "visionProblems",
  HEARING_LOSS: "hearingLoss",
  SLEEP_DISORDERS: "sleepDisorders",
  COVID: 'covid'
} as const;

const HadCondition = {
  I_DONT_KNOW: "i dont know",
  I_THINK_SO: "i think so",
  YES: "yes",
  NO: "no",
} as const;

const MenstrualCycle = {
  REGULAR: "Regular",
  IRREGULAR: "Irregular",
  MENOPAUSE: "Menopause",
} as const;

const PregnancyStatus = {
  PREGNANT: "Pregnant",
  NOT_PREGNANT: "Not Pregnant",
  TRYING: "Trying",
} as const;

const SleepPattern = {
  NORMAL: "Normal",
  INSOMNIA: "Insomnia",
  OVERSLEEPING: "Oversleeping",
} as const;

const StressLevel = {
  NONE: "None",
  MILD: "Mild",
  MODERATE: "Moderate",
  SEVERE: "Severe",
} as const;

const healthMetricsSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reports: [String],
    medicalHistory: [{
      condition: { 
        type: String, 
        enum: Object.values(MedicalCondition),
        required: true 
      },
      hadCondition: { 
        type: String, 
        enum: Object.values(HadCondition),
        required: true 
      },
      ageOfOnset: Number,
      treatmentStatus: { type: String, enum: Object.values(TreatmentStatus) },
      reports: [String],
    }],
    vitals: [{
      temperature: Number,
      bloodPressure: String,
      pulseRate: Number,
      respiratoryRate: Number,
      bloodSugarRandom: Number,
      bloodSugarFasting: Number,
      bloodSugarPP: Number,
      oxygenSaturation: Number,
      height: Number,
      weight: Number,
      bmi: Number,
    }],
    femaleHealth: {
      lastMenstrualPeriod: Date,
      menstrualCycle: {
        type: String,
        enum: Object.values(MenstrualCycle),
      },
      pregnancyStatus: {
        type: String,
        enum: Object.values(PregnancyStatus),
      },
      contraceptiveUse: String,
      pregnancies: Number,
      deliveries: Number,
      abortions: Number,
    },
    medications: {
      otcHerbalUse: String,
      allergiesDrug: [String],
      allergiesFood: [String],
      allergiesEnvironmental: [String],
      recentVaccinations: [String],
      tobaccoUse: Boolean,
      alcoholUse: Boolean,
      drugUse: Boolean,
    },
    mentalHealth: {
      memoryIssues: Boolean,
      moodDiagnosis: String,
      sleepPattern: {
        type: String,
        enum: Object.values(SleepPattern),
      },
      stressLevel: {
        type: String,
        enum: Object.values(StressLevel),
      },
    },
    dentalHealth: {
      lastDentalVisit: Date,
      dentalIssues: [String],
      brushingHabit: String,
      oralConcerns: String,
    },
  },
  { timestamps: true }
);

export {
  TreatmentStatus,
  MedicalCondition,
  HadCondition,
  MenstrualCycle,
  PregnancyStatus,
  SleepPattern,
  StressLevel,
};

export const HealthMetrics = mongoose.model(
  "HealthMetrics",
  healthMetricsSchema
);
