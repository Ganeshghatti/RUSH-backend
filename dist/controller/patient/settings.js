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
const updatePersonalInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { profilePic, firstName, lastName, email, phone, dob, gender, address, } = req.body;
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
                message: "User not found",
            });
            return;
        }
        res.json({
            message: "Personal info updated successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Error updating personal info:", error);
        res.status(500).json({ message: "Server error" });
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
                message: "Incomplete data. Please provide personalIdProof, addressProof, and taxProof.",
            });
            return;
        }
        // make sure we are saving S3 key in the DB not urls
        if (personalIdProof.image && personalIdProof.image.includes('https://'))
            personalIdProof.image = yield (0, upload_media_1.getKeyFromSignedUrl)(personalIdProof.image);
        if (addressProof.image && addressProof.image.includes('https://'))
            addressProof.image = yield (0, upload_media_1.getKeyFromSignedUrl)(addressProof.image);
        if (taxProof.image && taxProof.image.includes('https://'))
            taxProof.image = yield (0, upload_media_1.getKeyFromSignedUrl)(taxProof.image);
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
            res.status(404).json({ success: false, message: "User not found." });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Identity proofs updated successfully.",
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
                message: "Validation failed.",
                errors: err.errors,
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Server error. Could not update identity proofs.",
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
                message: "insuranceDetails must be an array.",
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
            res.status(404).json({ success: false, message: "User not found." });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Insurance details updated successfully.",
            data: user.insuranceDetails,
        });
    }
    catch (err) {
        console.error("Error updating insurance details:", err);
        res
            .status(500)
            .json({ success: false, message: "Server error. Please try again." });
    }
});
exports.updateInsuranceDetails = updateInsuranceDetails;
const updateBankDetail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { bankDetails } = req.body;
        if (!bankDetails || Object.keys(bankDetails).length === 0) {
            res.status(400).json({
                success: false,
                message: "No bank details provided",
            });
            return;
        }
        const updatedUser = yield user_model_1.default.findByIdAndUpdate(userId, { $set: { bankDetails } }, { new: true, runValidators: true, select: "-password" });
        if (!updatedUser) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Bank details updated successfully",
            data: updatedUser.bankDetails, // return just bankDetails
        });
    }
    catch (error) {
        console.error("Error updating bank details:", error);
        res.status(500).json({
            success: false,
            message: "Error updating bank details",
            error: error.message,
        });
    }
});
exports.updateBankDetail = updateBankDetail;
