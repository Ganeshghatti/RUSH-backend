"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addOrUpdateHealthMetrics = exports.getHealthMetricsById = exports.getHealthMetrics = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const family_model_1 = __importDefault(require("../../models/user/family-model"));
const health_metrics_model_1 = require("../../models/health-metrics-model");
const validation_1 = require("../../validation/validation");
const upload_media_1 = require("../../utils/aws_s3/upload-media");
const delete_media_1 = require("../../utils/aws_s3/delete-media");
// get health metrics for patient
const getHealthMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        //finding the patient linked with this userId
        const patient = yield patient_model_1.default.findOne({ userId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "getHealthMetrics:patient-not-found",
            });
            return;
        }
        // check if patient has healthMetricsId
        if (!patient.healthMetricsId) {
            res.status(200).json({
                success: true,
                message: "No health metrics are associated with this patient yet.",
                action: "getHealthMetrics:metrics-missing",
            });
            return;
        }
        const healthMetrics = yield health_metrics_model_1.HealthMetrics.findById(patient.healthMetricsId);
        if (!healthMetrics) {
            res.status(404).json({
                success: false,
                message: "We couldn't find health metrics for this patient.",
                action: "getHealthMetrics:metrics-not-found",
            });
            return;
        }
        if ((healthMetrics === null || healthMetrics === void 0 ? void 0 : healthMetrics.medicalHistory) &&
            healthMetrics.medicalHistory.length > 0) {
            const updatedMedicalHistory = yield Promise.all(healthMetrics.medicalHistory.map((history) => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                if (history.reports) {
                    try {
                        const signedUrl = yield (0, upload_media_1.GetSignedUrl)(history.reports);
                        return Object.assign(Object.assign({}, ((_b = (_a = history.toObject) === null || _a === void 0 ? void 0 : _a.call(history)) !== null && _b !== void 0 ? _b : history)), { reports: signedUrl });
                    }
                    catch (err) {
                        console.error("Error generating signed URL:", err);
                        return history;
                    }
                }
                return history;
            })));
            healthMetrics.medicalHistory = updatedMedicalHistory;
        }
        res.status(200).json({
            success: true,
            message: "Health metrics fetched successfully.",
            action: "getHealthMetrics:success",
            data: healthMetrics,
        });
    }
    catch (error) {
        console.error("Error fetching health metrics:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't fetch the health metrics right now.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getHealthMetrics = getHealthMetrics;
// get health metrics by ID (must belong to current patient or their family)
const getHealthMetricsById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { healthMetricsId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(healthMetricsId)) {
            res.status(400).json({
                success: false,
                message: "The health metrics ID provided is invalid.",
                action: "getHealthMetricsById:validate-id",
            });
            return;
        }
        const healthMetrics = yield health_metrics_model_1.HealthMetrics.findById(healthMetricsId);
        if (!healthMetrics) {
            res.status(404).json({
                success: false,
                message: "We couldn't find health metrics with that ID.",
                action: "getHealthMetricsById:metrics-not-found",
            });
            return;
        }
        const patient = yield patient_model_1.default.findOne({ userId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "getHealthMetricsById:patient-not-found",
            });
            return;
        }
        const patientIdStr = patient._id.toString();
        const metricsPatientId = (_c = (_b = healthMetrics.patientId) === null || _b === void 0 ? void 0 : _b.toString) === null || _c === void 0 ? void 0 : _c.call(_b);
        if (metricsPatientId !== patientIdStr) {
            res.status(403).json({
                success: false,
                message: "You don't have access to these health metrics.",
                action: "getHealthMetricsById:forbidden",
            });
            return;
        }
        if (healthMetrics.ownerType === "Family" && healthMetrics.familyId) {
            const family = yield family_model_1.default.findOne({
                _id: healthMetrics.familyId,
                patientId: patient._id,
            });
            if (!family) {
                res.status(403).json({
                    success: false,
                    message: "You don't have access to these health metrics.",
                    action: "getHealthMetricsById:forbidden",
                });
                return;
            }
        }
        if ((healthMetrics === null || healthMetrics === void 0 ? void 0 : healthMetrics.medicalHistory) &&
            healthMetrics.medicalHistory.length > 0) {
            const updatedMedicalHistory = yield Promise.all(healthMetrics.medicalHistory.map((history) => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                if (history.reports) {
                    try {
                        const signedUrl = yield (0, upload_media_1.GetSignedUrl)(history.reports);
                        return Object.assign(Object.assign({}, ((_b = (_a = history.toObject) === null || _a === void 0 ? void 0 : _a.call(history)) !== null && _b !== void 0 ? _b : history)), { reports: signedUrl });
                    }
                    catch (err) {
                        console.error("Error generating signed URL:", err);
                        return history;
                    }
                }
                return history;
            })));
            healthMetrics.medicalHistory = updatedMedicalHistory;
        }
        res.status(200).json({
            success: true,
            message: "Health metrics fetched successfully.",
            action: "getHealthMetricsById:success",
            data: healthMetrics,
        });
    }
    catch (error) {
        console.error("Error fetching health metrics:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't fetch the health metrics right now.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getHealthMetricsById = getHealthMetricsById;
// Create or update health metrics (for patient or family)
const addOrUpdateHealthMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const userId = req.user.id;
        // validate input (strip document metadata like createdAt, updatedAt, __v via schema .strip())
        const validationResult = validation_1.healthMetricsSchemaZod.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: "Please review the health metrics details and try again.",
                action: "addOrUpdateHealthMetrics:validation-error",
                data: {
                    errors: validationResult.error.errors,
                },
            });
            return;
        }
        //finding the patient linked with this userId
        const patient = yield patient_model_1.default.findOne({ userId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "addOrUpdateHealthMetrics:patient-not-found",
            });
            return;
        }
        const _e = validationResult.data, { familyMemberId } = _e, rest = __rest(_e, ["familyMemberId"]);
        const payload = Object.assign({}, rest);
        // Store only S3 keys for reports, not full URLs (client may send back presigned URLs from GET)
        if (payload.medicalHistory && Array.isArray(payload.medicalHistory)) {
            for (const entry of payload.medicalHistory) {
                if (entry.reports && typeof entry.reports === "string" && entry.reports.includes("https://")) {
                    const key = yield (0, upload_media_1.getKeyFromSignedUrl)(entry.reports);
                    entry.reports = key !== null && key !== void 0 ? key : entry.reports;
                }
            }
        }
        const ownerType = familyMemberId ? "Family" : "Patient";
        //***** if ownerType is family *****\\
        if (familyMemberId) {
            // find the family
            const family = yield family_model_1.default.findOne({
                _id: familyMemberId,
                patientId: patient._id,
            });
            if (!family) {
                res.status(400).json({
                    success: false,
                    message: "We couldn't verify that family member.",
                    action: "addOrUpdateHealthMetrics:family-not-authorized",
                });
                return;
            }
            if (family.basicDetails.gender !== "Female") {
                delete payload.femaleHealth;
            }
            // if family already has a linked health metrices update it
            if (family.healthMetricsId) {
                const existing = yield health_metrics_model_1.HealthMetrics.findById(family.healthMetricsId).lean();
                const newReportKeys = new Set(((_a = payload.medicalHistory) !== null && _a !== void 0 ? _a : [])
                    .map((h) => h === null || h === void 0 ? void 0 : h.reports)
                    .filter(Boolean));
                if ((_b = existing === null || existing === void 0 ? void 0 : existing.medicalHistory) === null || _b === void 0 ? void 0 : _b.length) {
                    for (const h of existing.medicalHistory) {
                        const oldKey = h.reports;
                        if (oldKey && !newReportKeys.has(oldKey)) {
                            try {
                                yield (0, delete_media_1.DeleteMediaFromS3)({ key: oldKey });
                            }
                            catch (err) {
                                console.warn("Failed to delete old health metrics report from S3:", err);
                            }
                        }
                    }
                }
                const updated = yield health_metrics_model_1.HealthMetrics.findByIdAndUpdate(family.healthMetricsId, {
                    $set: Object.assign(Object.assign({}, payload), { ownerType, patientId: patient._id, familyId: familyMemberId }),
                }, { new: true, runValidators: true });
                if (!updated) {
                    res.status(500).json({
                        success: false,
                        message: "We couldn't update the family health metrics.",
                        action: "addOrUpdateHealthMetrics:update-family-failed",
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: "Family health metrics updated successfully.",
                    action: "addOrUpdateHealthMetrics:update-family-success",
                    data: updated,
                });
                return;
            }
            // if not the create a new health metrices document
            const newMetrics = new health_metrics_model_1.HealthMetrics(Object.assign({ patientId: patient._id, ownerType, familyId: familyMemberId }, payload));
            const saved = yield newMetrics.save();
            // update the healthMetricesId key in the family document
            family.healthMetricsId = saved._id;
            yield family.save();
            res.status(201).json({
                success: true,
                message: "Family health metrics created successfully.",
                action: "addOrUpdateHealthMetrics:create-family-success",
                data: saved,
            });
            return;
        }
        //***** if ownerType is patient ******\\
        const user = yield user_model_1.default.findById(userId);
        if ((user === null || user === void 0 ? void 0 : user.gender) !== "Female") {
            delete rest.femaleHealth;
        }
        //if patient already has healthMetrics update it
        if (patient.healthMetricsId) {
            const existing = yield health_metrics_model_1.HealthMetrics.findById(patient.healthMetricsId).lean();
            const newReportKeys = new Set(((_c = payload.medicalHistory) !== null && _c !== void 0 ? _c : [])
                .map((h) => h === null || h === void 0 ? void 0 : h.reports)
                .filter(Boolean));
            if ((_d = existing === null || existing === void 0 ? void 0 : existing.medicalHistory) === null || _d === void 0 ? void 0 : _d.length) {
                for (const h of existing.medicalHistory) {
                    const oldKey = h.reports;
                    if (oldKey && !newReportKeys.has(oldKey)) {
                        try {
                            yield (0, delete_media_1.DeleteMediaFromS3)({ key: oldKey });
                        }
                        catch (err) {
                            console.warn("Failed to delete old health metrics report from S3:", err);
                        }
                    }
                }
            }
            const updated = yield health_metrics_model_1.HealthMetrics.findByIdAndUpdate(patient.healthMetricsId, {
                $set: Object.assign(Object.assign({}, payload), { ownerType, patientId: patient._id }),
            }, { new: true, runValidators: true });
            if (!updated) {
                res.status(500).json({
                    success: false,
                    message: "We couldn't update the patient health metrics.",
                    action: "addOrUpdateHealthMetrics:update-patient-failed",
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: "Patient health metrics updated successfully.",
                action: "addOrUpdateHealthMetrics:update-patient-success",
                data: updated,
            });
            return;
        }
        const newMetrics = new health_metrics_model_1.HealthMetrics(Object.assign({ patientId: patient._id, ownerType }, payload));
        const saved = yield newMetrics.save();
        patient.healthMetricsId = saved._id;
        yield patient.save();
        res.status(201).json({
            success: true,
            message: "Patient health metrics created successfully.",
            action: "addOrUpdateHealthMetrics:create-patient-success",
            data: saved,
        });
    }
    catch (error) {
        console.error("Error adding/updating health metrics:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't add or update the health metrics.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.addOrUpdateHealthMetrics = addOrUpdateHealthMetrics;
