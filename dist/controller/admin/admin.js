"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.updateDocumentVerificationStatus = exports.updateDoctorStatus = exports.getAllPatients = exports.getAllDoctors = void 0;
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const signed_url_1 = require("../../utils/signed-url");
const user_notifications_1 = require("../../utils/mail/user_notifications");
const getAllDoctors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find all users who are doctors and populate their doctor data (excluding password)
        const users = yield user_model_1.default.find({ roles: "doctor" })
            .populate({
            path: 'roleRefs.doctor',
            select: '-password'
        });
        if (!users || users.length === 0) {
            res.status(404).json({
                success: false,
                message: "We couldn't find any doctor accounts.",
                action: "getAllDoctors:doctor-not-found",
            });
            return;
        }
        // Generate signed URLs for all users
        const usersWithSignedUrls = yield Promise.all(users.map(user => (0, signed_url_1.generateSignedUrlsForUser)(user)));
        res.status(200).json({
            success: true,
            message: "Doctor accounts fetched successfully.",
            action: "getAllDoctors:success",
            data: usersWithSignedUrls,
        });
    }
    catch (error) {
        console.error("Error fetching doctor accounts:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load doctor accounts right now.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getAllDoctors = getAllDoctors;
const getAllPatients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find all users who are patients and populate their patient data (excluding password)
        const users = yield user_model_1.default.find({ roles: "patient" })
            .populate({
            path: 'roleRefs.patient',
            select: '-password'
        });
        if (!users || users.length === 0) {
            res.status(404).json({
                success: false,
                message: "We couldn't find any patient accounts.",
                action: "getAllPatients:patient-not-found",
            });
            return;
        }
        // Filter out users where patient role ref failed to populate and generate signed URLs for basic user data only
        const validUsers = users.filter(user => { var _a; return ((_a = user.roleRefs) === null || _a === void 0 ? void 0 : _a.patient) && typeof user.roleRefs.patient === 'object'; });
        const usersWithSignedUrls = yield Promise.all(validUsers.map((user) => __awaiter(void 0, void 0, void 0, function* () {
            // Create a clone and only process basic user fields to avoid the signed URL error
            const clone = JSON.parse(JSON.stringify(user));
            // Only handle profile picture for now
            if (clone === null || clone === void 0 ? void 0 : clone.profilePic) {
                try {
                    const { GetSignedUrl } = yield Promise.resolve().then(() => __importStar(require("../../utils/aws_s3/upload-media")));
                    clone.profilePic = yield GetSignedUrl(clone.profilePic);
                }
                catch (error) {
                    console.warn("Could not generate signed URL for profile pic:", error);
                }
            }
            return clone;
        })));
        res.status(200).json({
            success: true,
            message: "Patient accounts fetched successfully.",
            action: "getAllPatients:success",
            data: usersWithSignedUrls,
        });
    }
    catch (error) {
        console.error("Error fetching patient accounts:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load patient accounts right now.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getAllPatients = getAllPatients;
const updateDoctorStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { doctorId } = req.params;
        const { status, message } = req.body;
        if (!["approved", "rejected", "pending"].includes(status)) {
            res.status(400).json({
                success: false,
                message: "Status must be approved, rejected, or pending.",
                action: "updateDoctorStatus:invalid-status",
            });
            return;
        }
        const updatedDoctor = yield doctor_model_1.default.findByIdAndUpdate(doctorId, {
            $set: { status },
            $push: { message: { message, date: new Date() } }
        }, { new: true, select: '-password' });
        if (!updatedDoctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that doctor account.",
                action: "updateDoctorStatus:doctor-not-found",
            });
            return;
        }
        // Send notification email to doctor and admin
        const populatedDoctor = yield doctor_model_1.default.findById(updatedDoctor._id).populate("userId");
        if (populatedDoctor && populatedDoctor.userId) {
            yield (0, user_notifications_1.sendAccountStatusMail)({
                userName: `${populatedDoctor.userId.firstName} ${populatedDoctor.userId.lastName}`,
                email: populatedDoctor.userId.email,
                status: status,
                role: "doctor",
                message: message
            });
        }
        else {
            // Log an error if we can't get user details for the email, but don't fail the request
            console.error(`Could not send status update email for doctorId: ${doctorId} because user details could not be populated.`);
        }
        res.status(200).json({
            success: true,
            message: "Doctor status updated successfully.",
            action: "updateDoctorStatus:success",
            data: updatedDoctor,
        });
    }
    catch (error) {
        console.error("Error updating doctor status:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't update the doctor status.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.updateDoctorStatus = updateDoctorStatus;
const updateDocumentVerificationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { isDocumentVerified } = req.body;
    if (typeof isDocumentVerified !== "boolean") {
        res.status(400).json({
            success: false,
            message: "Document verification flag must be true or false.",
            action: "updateDocumentVerificationStatus:invalid-flag",
        });
        return;
    }
    try {
        const user = yield user_model_1.default.findByIdAndUpdate(userId, { isDocumentVerified }, { new: true });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that user.",
                action: "updateDocumentVerificationStatus:user-not-found",
            });
            return;
        }
        // Send notification email to doctor only
        if (user.roles.includes('doctor')) {
            yield (0, user_notifications_1.sendDocumentVerificationMail)({
                userName: `${user.firstName} ${user.lastName}`,
                email: user.email,
                status: isDocumentVerified ? 'Verified' : 'Rejected',
                role: 'doctor',
                message: `Your document verification status has been updated.`
            });
        }
        else {
            console.warn(`Document verification status updated for a non-doctor user: ${userId}. No email sent.`);
        }
        res.status(200).json({
            success: true,
            message: "User verification status updated successfully.",
            action: "updateDocumentVerificationStatus:success",
            data: user,
        });
    }
    catch (error) {
        console.error("Error updating verification status:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't update the document verification status.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.updateDocumentVerificationStatus = updateDocumentVerificationStatus;
