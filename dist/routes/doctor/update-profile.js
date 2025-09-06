"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const update_profile_1 = require("../../controller/doctor/update-profile");
const doctor_1 = require("../../controller/doctor/doctor");
const router = (0, express_1.Router)();
// Route for updating doctor profile (uses req.user.id, no file upload needed)
router
    .route("/doctor/profile")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), update_profile_1.updateDoctorProfile);
// Route for updating doctor's online appointment availability (uses doctorId param)
router
    .route("/doctor/online-appointment/:doctorId")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), update_profile_1.updateDoctorOnlineAppointment);
router
    .route("/doctor/patients")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), doctor_1.getAllPatientsForDoctor);
// Route for getting doctor appointment statistics and counts
router
    .route("/doctor/appointments/stats")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), doctor_1.getDoctorAppointmentStats);
// Route for getting doctor dashboard data
router
    .route("/doctor/dashboard")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), doctor_1.getDoctorDashboard);
// Route for updating doctor active status
router
    .route("/doctor/active-status")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), doctor_1.updateDoctorActiveStatus);
exports.default = router;
