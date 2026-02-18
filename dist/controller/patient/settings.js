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
exports.updateBankDetail = exports.updateInsuranceDetails = exports.updateIdentityProof = exports.updatePersonalInfo = void 0;
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const upload_media_1 = require("../../utils/aws_s3/upload-media");
const delete_media_1 = require("../../utils/aws_s3/delete-media");
const updatePersonalInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        let { profilePic, firstName, lastName, email, phone, dob, gender, address, } = req.body;
        if (profilePic && typeof profilePic === "string" && profilePic.includes("https://")) {
            const key = yield (0, upload_media_1.getKeyFromSignedUrl)(profilePic);
            if (key)
                profilePic = key;
        }
        const existingUser = yield user_model_1.default.findById(userId).select("profilePic");
        if ((existingUser === null || existingUser === void 0 ? void 0 : existingUser.profilePic) &&
            profilePic &&
            existingUser.profilePic !== profilePic) {
            try {
                yield (0, delete_media_1.DeleteMediaFromS3)({ key: existingUser.profilePic });
            }
            catch (err) {
                console.warn("Failed to delete old profile pic from S3:", err);
            }
        }
        const updatedUser = yield user_model_1.default.findByIdAndUpdate(userId, {
            profilePic,
            firstName,
            lastName,
            email,
            phone,
            dob,
            gender,
            address,
        }, { new: true, runValidators: true }).select("-password");
        if (!updatedUser) {
            res.status(404).json({
                success: false,
                message: "We couldn't find the requested user.",
                action: "updatePersonalInfo:user-not-found",
            });
            return;
        }
        res.json({
            success: true,
            message: "Your personal information has been updated.",
            action: "updatePersonalInfo:success",
            data: {
                user: updatedUser,
            },
        });
    }
    catch (error) {
        console.error("Error updating personal info:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't update your personal information.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.updatePersonalInfo = updatePersonalInfo;
const updateIdentityProof = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { personalIdProof, addressProof, taxProof } = req.body;
        if (!personalIdProof || !addressProof || !taxProof) {
            res.status(400).json({
                success: false,
                message: "Please provide personal ID, address, and tax proofs to continue.",
                action: "updateIdentityProof:validate-missing-proof",
            });
            return;
        }
        // Store S3 keys in the DB, not presigned URLs
        if (personalIdProof.image && personalIdProof.image.includes("https://")) {
            const key = yield (0, upload_media_1.getKeyFromSignedUrl)(personalIdProof.image);
            if (key)
                personalIdProof.image = key;
        }
        if (addressProof.image && addressProof.image.includes("https://")) {
            const key = yield (0, upload_media_1.getKeyFromSignedUrl)(addressProof.image);
            if (key)
                addressProof.image = key;
        }
        if (taxProof.image && taxProof.image.includes("https://")) {
            const key = yield (0, upload_media_1.getKeyFromSignedUrl)(taxProof.image);
            if (key)
                taxProof.image = key;
        }
        const updatedUser = yield user_model_1.default.findByIdAndUpdate(userId, {
            $set: {
                personalIdProof: personalIdProof,
                addressProof: addressProof,
                taxProof: taxProof,
            },
        }, {
            new: true,
            runValidators: true,
        });
        if (!updatedUser) {
            res.status(404).json({
                success: false,
                message: "We couldn't find the requested user.",
                action: "updateIdentityProof:user-not-found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Identity proofs updated successfully.",
            action: "updateIdentityProof:success",
            data: {
                personalIdProof: updatedUser.personalIdProof,
                addressProof: updatedUser.addressProof,
                taxProof: updatedUser.taxProof,
            },
        });
    }
    catch (err) {
        console.error("Error updating identity proofs:", err);
        if (err.name === "ValidationError") {
            res.status(400).json({
                success: false,
                message: "Some of the provided proof details are invalid.",
                action: "updateIdentityProof:validation-error",
                data: {
                    errors: err.errors,
                },
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "We couldn't update your identity proofs.",
            action: err instanceof Error ? err.message : String(err),
        });
    }
});
exports.updateIdentityProof = updateIdentityProof;
const updateInsuranceDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Expect an array of insurance details from the frontend
        const { insuranceDetails } = req.body;
        if (!Array.isArray(insuranceDetails)) {
            res.status(400).json({
                success: false,
                message: "Insurance details must be provided as a list.",
                action: "updateInsuranceDetails:validate-array",
            });
            return;
        }
        // find the user and update the insuranceDetails array entirly.
        const user = yield user_model_1.default.findByIdAndUpdate(userId, {
            $set: { insuranceDetails: insuranceDetails },
        }, {
            new: true,
            runValidators: true,
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "We couldn't find the requested user.",
                action: "updateInsuranceDetails:user-not-found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Insurance details updated successfully.",
            action: "updateInsuranceDetails:success",
            data: user.insuranceDetails,
        });
    }
    catch (err) {
        console.error("Error updating insurance details:", err);
        res.status(500).json({
            success: false,
            message: "We couldn't update the insurance details.",
            action: err instanceof Error ? err.message : String(err),
        });
    }
});
exports.updateInsuranceDetails = updateInsuranceDetails;
const updateBankDetail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const updateData = req.body;
        if (!updateData || Object.keys(updateData).length === 0) {
            res.status(400).json({
                success: false,
                message: "Please share the bank details you want to save.",
                action: "updateBankDetail:validate-missing-details",
            });
            return;
        }
        const updateFields = {};
        for (const [key, value] of Object.entries(updateData)) {
            updateFields[`bankDetails.${key}`] = value;
        }
        const updatedUser = yield user_model_1.default.findByIdAndUpdate(userId, { $set: updateFields }, { new: true, runValidators: true, select: "-password" });
        if (!updatedUser) {
            res.status(404).json({
                success: false,
                message: "We couldn't find the requested user.",
                action: "updateBankDetail:user-not-found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Bank details updated successfully",
            action: "updateBankDetail:success",
            data: updatedUser.bankDetails,
        });
    }
    catch (error) {
        console.error("Error updating bank details:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't update the bank details.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.updateBankDetail = updateBankDetail;
