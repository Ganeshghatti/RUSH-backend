"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uploadPathMap = {
    userProfilePic: (userId) => `${userId}/settings/profilePic/`,
    personalIdProof: (userId) => `${userId}/settings/identityProof/personalId/`,
    addressProof: (userId) => `${userId}/settings/identityProof/addressProof/`,
    taxProof: (userId) => `${userId}/settings/identityProof/taxProof/`,
    insuranceDetails: (userId) => `${userId}/settings/insuranceDetails/`,
    bankingQR: (userId) => `${userId}/settings/bankingDetails/`,
    emergencyMedia: (userId) => `${userId}/appointments/emergency/`,
    familyIdProof: (userId, familyId) => `${userId}/family/${familyId}/idProof/`,
    familyInsurance: (userId, familyId) => `${userId}/family/${familyId}/insurance/`,
    healthMetricsPatient: (userId) => `${userId}/healthMetrics/medicalHistory/`,
    healthMetricsFamily: (userId, familyId) => `${userId}/family/${familyId}/healthMetrics/medicalHistory/`,
    doctorQualification: (userId) => `${userId}/doctor/qualification/`,
    doctorLicense: (userId) => `${userId}/doctor/license/`,
    doctorSignature: (userId) => `${userId}/doctor/signature/`,
};
exports.default = uploadPathMap;
