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
exports.getFamilyDetails = exports.removeFamily = exports.updateFamily = exports.addFamily = void 0;
const patient_model_1 = __importDefault(require("../../models/user/patient-model"));
const family_model_1 = __importDefault(require("../../models/user/family-model"));
const validation_1 = require("../../validation/validation");
const signed_url_1 = require("../../utils/signed-url");
const mongoose_1 = __importDefault(require("mongoose"));
const upload_media_1 = require("../../utils/aws_s3/upload-media");
const flattenObject = (obj, parentKey = "", res = {}) => {
    for (const key in obj) {
        const propName = parentKey ? `${parentKey}.${key}` : key;
        if (typeof obj[key] === "object" && !Array.isArray(obj[key]) && obj[key] !== null) {
            flattenObject(obj[key], propName, res);
        }
        else {
            res[propName] = obj[key];
        }
    }
    return res;
};
// Add a new family
const addFamily = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const validationResult = validation_1.addFamilySchema.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: "Please check the family member details and try again.",
                action: "addFamily:validation-error",
                data: {
                    errors: validationResult.error.errors,
                },
            });
            return;
        }
        const patient = yield patient_model_1.default.findOne({ userId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "addFamily:patient-not-found",
            });
            return;
        }
        const newFamily = new family_model_1.default(Object.assign({ patientId: patient._id }, validationResult.data));
        const savedFamily = yield newFamily.save();
        const familyWithUrls = yield (0, signed_url_1.generateSignedUrlsForFamily)(savedFamily);
        // console.log("Family with url ",familyWithUrls);
        res.status(201).json({
            success: true,
            message: "Family member added successfully.",
            action: "addFamily:success",
            data: familyWithUrls,
        });
    }
    catch (error) {
        console.error("Error adding family member:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't add the family member.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.addFamily = addFamily;
// update an existing family
const updateFamily = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { familyId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(familyId)) {
            res.status(400).json({
                success: false,
                message: "The family ID provided is invalid.",
                action: "updateFamily:validate-family-id",
            });
            return;
        }
        console.log("Req.boyd ", req.body);
        const validationResult = validation_1.updateFamilySchema.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: "Please check the family member details and try again.",
                action: "updateFamily:validation-error",
                data: {
                    errors: validationResult.error.errors,
                },
            });
            return;
        }
        const patient = yield patient_model_1.default.findOne({ userId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "updateFamily:patient-not-found",
            });
            return;
        }
        const validatedData = validationResult.data;
        console.log('Validated data');
        if (validatedData.insurance && Array.isArray(validatedData.insurance)) {
            for (const item of validatedData.insurance) {
                if (item.image && item.image.includes("https://")) {
                    console.log("Hello there ", item.image);
                    const key = yield (0, upload_media_1.getKeyFromSignedUrl)(item.image);
                    console.log("hey ", key);
                    item.image = key !== null && key !== void 0 ? key : undefined;
                }
            }
        }
        const flattenedData = flattenObject(validatedData);
        console.log("Flattened data ", flattenedData);
        const updatedFamily = yield family_model_1.default.findOneAndUpdate({ _id: familyId, patientId: patient._id }, { $set: flattenedData }, // set operator tells db only update the fields present in this object.
        { new: true, runValidators: true });
        if (!updatedFamily) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that family member or you don't have access.",
                action: "updateFamily:family-not-found",
            });
            return;
        }
        const familyWithUrls = yield (0, signed_url_1.generateSignedUrlsForFamily)(updatedFamily);
        res.status(200).json({
            success: true,
            message: "Family member updated successfully.",
            action: "updateFamily:success",
            data: familyWithUrls,
        });
    }
    catch (error) {
        console.error("Error updating family member:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't update the family member.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.updateFamily = updateFamily;
// delete a family
const removeFamily = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { familyId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(familyId)) {
            res.status(400).json({
                success: false,
                message: "The family ID provided is invalid.",
                action: "removeFamily:validate-family-id",
            });
            return;
        }
        const patient = yield patient_model_1.default.findOne({ userId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "removeFamily:patient-not-found",
            });
            return;
        }
        const deletedFamily = yield family_model_1.default.findOneAndDelete({
            _id: familyId,
            patientId: patient._id,
        });
        if (!deletedFamily) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that family member or you don't have access.",
                action: "removeFamily:family-not-found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Family member removed successfully.",
            action: "removeFamily:success",
        });
    }
    catch (error) {
        console.error("Error removing family member:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't remove the family member.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.removeFamily = removeFamily;
// get all the family
const getFamilyDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const patient = yield patient_model_1.default.findOne({ userId });
        if (!patient) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your patient profile.",
                action: "getFamilyDetails:patient-not-found",
            });
            return;
        }
        const families = yield family_model_1.default.find({ patientId: patient._id });
        const familiesWithUrls = yield (0, signed_url_1.generateSignedUrlsForFamilies)(families);
        res.status(200).json({
            success: true,
            message: "Family details fetched successfully.",
            action: "getFamilyDetails:success",
            data: familiesWithUrls,
        });
    }
    catch (error) {
        console.error("Error fetching family details:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't fetch family details right now.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getFamilyDetails = getFamilyDetails;
