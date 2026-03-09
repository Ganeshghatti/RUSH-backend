"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const appointment_1 = require("../../controller/appointment/appointment");
const router = (0, express_1.Router)();
/** GET all appointments for the logged-in doctor (online, emergency, clinic, home visit) */
router
    .route("/doctor")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), appointment_1.getDoctorAppointments);
/** POST get doctor's appointments filtered by date (body: { date: "YYYY-MM-DD" }) */
router
    .route("/doctor/by-date")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), appointment_1.getDoctorAppointmentByDate);
/** GET all appointments for the logged-in patient (online, emergency, clinic, home visit) */
router
    .route("/patient")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), appointment_1.getPatientAppointments);
exports.default = router;
