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
const delete_media_1 = require("../../utils/aws_s3/delete-media");
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
    var _a, _b, _c, _d;
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
        if (((_a = validatedData.idProof) === null || _a === void 0 ? void 0 : _a.idImage) && validatedData.idProof.idImage.includes("https://")) {
            const key = yield (0, upload_media_1.getKeyFromSignedUrl)(validatedData.idProof.idImage);
            validatedData.idProof.idImage = key !== null && key !== void 0 ? key : validatedData.idProof.idImage;
        }
        if (validatedData.insurance && Array.isArray(validatedData.insurance)) {
            for (const item of validatedData.insurance) {
                if (item.image && item.image.includes("https://")) {
                    const key = yield (0, upload_media_1.getKeyFromSignedUrl)(item.image);
                    item.image = key !== null && key !== void 0 ? key : undefined;
                }
            }
        }
        const existingFamily = yield family_model_1.default.findOne({
            _id: familyId,
            patientId: patient._id,
        });
        const newIdImageKey = (_b = validatedData.idProof) === null || _b === void 0 ? void 0 : _b.idImage;
        const newInsuranceImageKeys = new Set(((_c = validatedData.insurance) !== null && _c !== void 0 ? _c : [])
            .map((i) => i === null || i === void 0 ? void 0 : i.image)
            .filter(Boolean));
        if (existingFamily) {
            if (((_d = existingFamily.idProof) === null || _d === void 0 ? void 0 : _d.idImage) &&
                newIdImageKey &&
                existingFamily.idProof.idImage !== newIdImageKey) {
                try {
                    yield (0, delete_media_1.DeleteMediaFromS3)({ key: existingFamily.idProof.idImage });
                }
                catch (err) {
                    console.warn("Failed to delete old family idProof image from S3:", err);
                }
            }
            if (Array.isArray(existingFamily.insurance)) {
                for (const item of existingFamily.insurance) {
                    const oldKey = item === null || item === void 0 ? void 0 : item.image;
                    if (oldKey && !newInsuranceImageKeys.has(oldKey)) {
                        try {
                            yield (0, delete_media_1.DeleteMediaFromS3)({ key: oldKey });
                        }
                        catch (err) {
                            console.warn("Failed to delete old family insurance image from S3:", err);
                        }
                    }
                }
            }
        }
        // Flatten nested payload to dot-notation for $set so only provided nested fields are updated (e.g. { basicDetails: { name: "x" } } → { "basicDetails.name": "x" }).
        const flattenedData = {};
        const flatten = (obj, parentKey = "") => {
            for (const key in obj) {
                const propName = parentKey ? `${parentKey}.${key}` : key;
                const val = obj[key];
                if (typeof val === "object" && val !== null && !Array.isArray(val)) {
                    flatten(val, propName);
                }
                else {
                    flattenedData[propName] = val;
                }
            }
        };
        flatten(validatedData);
        const updatedFamily = yield family_model_1.default.findOneAndUpdate({ _id: familyId, patientId: patient._id }, { $set: flattenedData }, { new: true, runValidators: true });
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
