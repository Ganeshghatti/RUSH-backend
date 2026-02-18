"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const appointment_settings_1 = require("../../controller/doctor/appointment-settings");
const doctor_1 = require("../../controller/doctor/doctor");
const earning_1 = require("../../controller/doctor/earning");
const router = (0, express_1.Router)();
// Single route: update any of the 3 appointment-type settings (online, clinic, homeVisit)
router
    .route("/doctor/appointment-settings")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), appointment_settings_1.updateAppointmentSettings);
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
// Route for getting doctor earnings
router
    .route("/doctor/earnings")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), earning_1.getDoctorEarnings);
exports.default = router;
