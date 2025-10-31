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
exports.addHealthMetrics = exports.getHealthMetricsById = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const family_model_1 = __importDefault(require("../../models/user/family-model"));
const health_metrics_model_1 = require("../../models/health-metrics-model");
const validation_1 = require("../../validation/validation");
// get health metrics by ID
const getHealthMetricsById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { healthMetricsId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(healthMetricsId)) {
            res.status(400).json({
                success: false,
                message: "Invalid Health Metrics ID format",
            });
            return;
        }
        const healthMetrics = yield health_metrics_model_1.HealthMetrics.findById(healthMetricsId);
        //   .populate("patientId", "name email")
        //   .populate("familyId", "basicDetails.name relationship");
        if (!healthMetrics) {
            res.status(404).json({
                success: false,
                message: "Health Metrics not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Health Metrics fetched successfully",
            data: healthMetrics,
        });
    }
    catch (error) {
        console.error("Error fetching health metrics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch health metrics",
        });
    }
});
exports.getHealthMetricsById = getHealthMetricsById;
// add new health Metrics (for patient or family)
const addHealthMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // validate input
        const validationResult = validation_1.healthMetricsSchemaZod.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationResult.error.errors,
            });
            return;
        }
        //finding the patient linked with this userId
        const patient = yield patient_model_1.default.findOne({ userId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "Patient not found",
            });
            return;
        }
        const _a = validationResult.data, { familyMemberId } = _a, rest = __rest(_a, ["familyMemberId"]);
        const ownerType = familyMemberId ? "Family" : "Patient";
        let existingMetrics;
        //***** if ownerType is family *****\\
        if (familyMemberId) {
            // find the family
            const family = yield family_model_1.default.findOne({ _id: familyMemberId, patientId: patient._id });
            if (!family) {
                res.status(400).json({
                    success: false,
                    message: "Invalid family ID or not authorized",
                });
                return;
            }
            if (family.basicDetails.gender !== "Female") {
                delete rest.femaleHealth;
            }
            // check if family already has a linked health metrices
            if (family.healthMetricsId) {
                existingMetrics = yield health_metrics_model_1.HealthMetrics.findByIdAndUpdate(family.healthMetricsId, Object.assign(Object.assign({}, rest), { ownerType, patientId: patient._id, familyMemberId }), { new: true });
            }
            // if not the create a new health metrices document
            else {
                const newMetrics = new health_metrics_model_1.HealthMetrics(Object.assign({ patientId: patient._id, ownerType,
                    familyMemberId }, rest));
                existingMetrics = yield newMetrics.save();
                // update the healthMetricesId key in the family document
                family.healthMetricsId = existingMetrics._id;
                yield family.save();
            }
        }
        //***** if ownerType is patient ******\\
        else {
            const user = yield user_model_1.default.findById(userId);
            if ((user === null || user === void 0 ? void 0 : user.gender) !== "Female") {
                delete rest.femaleHealth;
            }
            existingMetrics = new health_metrics_model_1.HealthMetrics(Object.assign({ patientId: patient._id, ownerType }, rest));
            existingMetrics = yield existingMetrics.save();
        }
        res.status(201).json({
            success: true,
            message: familyMemberId
                ? "Family Health Metrics saved successfully"
                : "Patient Health Metrics saved successfully",
            data: existingMetrics,
        });
    }
    catch (error) {
        console.error("Error adding/updating health metrics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add or update health metrics",
        });
    }
});
exports.addHealthMetrics = addHealthMetrics;
