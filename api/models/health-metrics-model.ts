import mongoose from "mongoose";
const { Schema } = mongoose;

const TreatmentStatus = {
  ONGOING: "Ongoing",
  CONTROLLED: "Controlled",
  RESOLVED: "Resolved",
  NOT_TREATED: "Not Treated",
} as const;

const DiabetesType = {
  TYPE_1: "Type 1",
  TYPE_2: "Type 2",
  GESTATIONAL: "Gestational",
} as const;

const ThyroidType = {
  HYPO: "Hypo",
  HYPER: "Hyper",
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

const CovidStatus = {
  NEVER_INFECTED: "Never infected",
  RECOVERED: "Recovered",
  VACCINATED: "Vaccinated",
  BOOSTED: "Boosted",
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
    medicalHistory: [{
      condition: { 
        type: String, 
        enum: Object.values(MedicalCondition),
        required: true 
      },
      hasCondition: { type: Boolean, default: false },
      ageOfOnset: Number,
      treatmentStatus: { type: String, enum: Object.values(TreatmentStatus) },
      reports: [String],
    }],
    vitals: {
      temperature: Number,
      bloodPressure: String,
      pulseRate: Number,
      respiratoryRate: Number,
      bloodSugarRandom: Number,
      bloodSugarFasting: Number,
      bloodSugarPP: Number,
      oxygenSaturation: Number,
      painScale: { type: Number, min: 0, max: 10 },
      height: Number,
      weight: Number,
      bmi: Number,
    },
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
      currentMedications: String,
      otcHerbalUse: String,
      allergiesDrug: [String],
      allergiesFood: [String],
      allergiesEnvironmental: [String],
      pastSurgeries: [String],
      hospitalizations: [String],
      recentVaccinations: [String],
      recentTravelHistory: [String],
      tobaccoUse: Boolean,
      alcoholUse: Boolean,
      drugUse: Boolean,
    },
    infections: {
      covidStatus: {
        type: String,
        enum: Object.values(CovidStatus),
      },
      tbExposure: Boolean,
      hivHepatitisRisk: Boolean,
      contagiousExposure: Boolean,
      occupationalRisk: Boolean,
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
    currentSymptoms: [String],
    otherSymptomsText: String,
  },
  { timestamps: true }
);

export {
  TreatmentStatus,
  DiabetesType,
  ThyroidType,
  MedicalCondition,
  MenstrualCycle,
  PregnancyStatus,
  CovidStatus,
  SleepPattern,
  StressLevel,
};

export const HealthMetrics = mongoose.model(
  "HealthMetrics",
  healthMetricsSchema
);
