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
exports.getAllUniqueSpecialist = exports.searchSymptoms = void 0;
const symptom_model_1 = __importDefault(require("../../models/symptom-model"));
const searchSymptoms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query, limit } = req.query;
        const limitValue = limit ? parseInt(limit) : 10;
        let searchQuery = {};
        if (query) {
            searchQuery = { symptom: { $regex: query, $options: "i" } };
        }
        const symptoms = yield symptom_model_1.default.find(searchQuery)
            .limit(limitValue);
        res.status(200).json({
            success: true,
            message: "Symptoms fetched successfully",
            data: symptoms,
        });
    }
    catch (error) {
        console.error("Error searching symptoms:", error);
        res.status(500).json({
            success: false,
            message: "Failed to search symptoms",
        });
    }
});
exports.searchSymptoms = searchSymptoms;
const getAllUniqueSpecialist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get all unique symptoms using distinct
        const uniqueSymptoms = yield symptom_model_1.default.distinct('specialist');
        res.status(200).json({
            success: true,
            message: "Unique specialist fetched successfully",
            data: uniqueSymptoms,
        });
    }
    catch (error) {
        console.error("Error fetching unique specialist:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch unique specialist",
        });
    }
});
exports.getAllUniqueSpecialist = getAllUniqueSpecialist;
