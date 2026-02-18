"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const doctor_1 = require("../../controller/doctor/doctor");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const express_1 = require("express");
const settings_1 = require("../../controller/patient/settings");
const update_profile_1 = require("../../controller/doctor/update-profile");
const router = (0, express_1.Router)();
// Onboard: JSON body only (media uploaded via /media/upload first)
router
    .route("/onboard/doctor/:userId")
    .post(auth_middleware_1.verifyToken, doctor_1.doctorOnboardV2);
router.route("/user/:userId").get(doctor_1.getDoctorById);
// Profile settings - Doctor specific
router
    .route("/profile/personal-info")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), settings_1.updatePersonalInfo);
router
    .route("/profile/identity-proof")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), settings_1.updateIdentityProof);
router
    .route("/profile/professional-details")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), update_profile_1.updateProfessionalDetails);
router
    .route("/profile/bank-detail")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), settings_1.updateBankDetail);
exports.default = router;
