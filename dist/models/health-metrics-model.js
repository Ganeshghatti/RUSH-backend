"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthMetrics = exports.StressLevel = exports.SleepPattern = exports.PregnancyStatus = exports.MenstrualCycle = exports.HadCondition = exports.MedicalCondition = exports.TreatmentStatus = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
// ***** medical history
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
    COVID: "covid",
};
exports.MedicalCondition = MedicalCondition;
const HadCondition = {
    I_DONT_KNOW: "i dont know",
    I_THINK_SO: "i think so",
    YES: "yes",
    NO: "no",
};
exports.HadCondition = HadCondition;
const TreatmentStatus = {
    ONGOING: "Ongoing",
    CONTROLLED: "Controlled",
    NOT_TREATED: "Not Treated",
};
exports.TreatmentStatus = TreatmentStatus;
// ***** menstrual cycle
const MenstrualCycle = {
    REGULAR: "Regular",
    IRREGULAR: "Irregular",
    MENOPAUSE: "Menopause",
};
exports.MenstrualCycle = MenstrualCycle;
const PregnancyStatus = {
    PREGNANT: "Pregnant",
    NOT_PREGNANT: "Not Pregnant",
    TRYING: "Trying",
};
exports.PregnancyStatus = PregnancyStatus;
// ***** mental health
const SleepPattern = {
    NORMAL: "Normal",
    INSOMNIA: "Insomnia",
    OVERSLEEPING: "Oversleeping",
};
exports.SleepPattern = SleepPattern;
const StressLevel = {
    NONE: "None",
    MILD: "Mild",
    MODERATE: "Moderate",
    SEVERE: "Severe",
};
exports.StressLevel = StressLevel;
// ***** final schema
const healthMetricsSchema = new Schema({
    // this is ID of the patient(this health metrices can be of this patient or their family)
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ownerType: {
        type: String,
        required: true,
        enum: ["Patient", "Family"],
    },
    familyId: { type: Schema.Types.ObjectId, ref: "Family" },
    reports: [String],
    medicalHistory: [
        {
            condition: {
                type: String,
                enum: Object.values(MedicalCondition),
                required: true,
            },
            hadCondition: {
                type: String,
                enum: Object.values(HadCondition),
                required: true,
            },
            ageOfOnset: Number,
            treatmentStatus: { type: String, enum: Object.values(TreatmentStatus) },
            reports: [String],
        },
    ],
    vitals: [
        {
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
        },
    ],
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
}, { timestamps: true });
exports.HealthMetrics = mongoose_1.default.model("HealthMetrics", healthMetricsSchema);
