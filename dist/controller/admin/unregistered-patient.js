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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnregisteredPatient = exports.addUnregisteredPatient = void 0;
const unregistered_patient_model_1 = __importDefault(require("../../models/user/unregistered-patient-model"));
const addUnregisteredPatient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const patientsData = req.body;
        if (!Array.isArray(patientsData) || patientsData.length === 0) {
            res.status(400).json({
                success: false,
                message: "No patient data was provided.",
                action: "addUnregisteredPatient:empty-input",
            });
            return;
        }
        const patients = patientsData
            .map((row) => {
            const phoneVal = row.phone || "";
            const genderVal = row.gender || null;
            return {
                // basic details
                name: (row.name || "").toString().trim() || null,
                phone: phoneVal.toString().trim() || null,
                email: (row.email || "").toString().trim().toLowerCase() ||
                    null,
                gender: genderVal
                    ? genderVal.charAt(0).toUpperCase() +
                        genderVal.slice(1).toLowerCase()
                    : null,
                age: row.age !== undefined && row.age !== null
                    ? Number(row.age) || null
                    : null,
                // location details
                address: (row.address || "").toString().trim() || null,
                locality: (row.locality || "").toString().trim() || null,
                pincode: (row.pincode || "").toString().trim() || null,
                city: (row.city || "").toString().trim() || null,
                state: (row.state || "").toString().trim() || null,
                country: (row.country || "India").toString().trim() ||
                    "India",
                // medical details
                disease: (row.disease || "").toString().trim() || null,
            };
        })
            .filter((patient) => patient.name && patient.email && patient.phone);
        console.log("Patients ", patients);
        if (patients.length === 0) {
            res.status(400).json({
                success: false,
                message: "No valid patient records were found with the required fields.",
                action: "addUnregisteredPatient:no-valid-records",
            });
            return;
        }
        yield unregistered_patient_model_1.default.insertMany(patients);
        res.status(201).json({
            success: true,
            message: `${patients.length} unregistered patients added successfully.`,
            action: "addUnregisteredPatient:success",
            data: {
                inserted: patients.length,
            },
        });
    }
    catch (err) {
        console.error("Error adding unregistered patients:", err);
        res.status(500).json({
            success: false,
            message: "We couldn't add the unregistered patients.",
            action: err instanceof Error ? err.message : String(err),
        });
    }
});
exports.addUnregisteredPatient = addUnregisteredPatient;
const getUnregisteredPatient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const patients = yield unregistered_patient_model_1.default.find();
        res.status(200).json({
            success: true,
            message: "Unregistered patients fetched successfully.",
            action: "getUnregisteredPatient:success",
            data: patients,
        });
    }
    catch (err) {
        console.error("Error getting unregistered patients:", err);
        res.status(500).json({
            success: false,
            message: "We couldn't retrieve unregistered patients.",
            action: err instanceof Error ? err.message : String(err),
        });
    }
});
exports.getUnregisteredPatient = getUnregisteredPatient;
