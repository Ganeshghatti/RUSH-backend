"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth-middleware");
// import {
//   getDoctorClinicAvailability,
//   confirmClinicAppointment,
//   cancelClinicAppointment,
//   getAppointmentOTP,
//   validateVisitOTP,
// } from "../../controller/appointment/clinic-appointment";
const clinic_appointment_1 = require("../../controller/appointment/clinic-appointment");
const router = (0, express_1.Router)();
// Patient clinic appointment booking routes
// router
//   .route("/appointment/clinic/doctor/:doctorId")
//   .get(getDoctorClinicAvailability as RequestHandler);
router
    .route("/appointment/clinic/book")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), clinic_appointment_1.bookClinicAppointment);
// Patient clinic appointments
router
    .route("/appointment/clinic/patient")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), clinic_appointment_1.getPatientClinicAppointments);
// Doctor clinic appointments
router
    .route("/appointment/clinic/doctor")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), clinic_appointment_1.getDoctorClinicAppointments);
// Confirm appointment (Doctor only)
router
    .route("/appointment/clinic/:appointmentId/confirm")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), clinic_appointment_1.acceptClinicAppointment);
// Cancel appointment (Doctor only)
// router
//   .route("/appointment/clinic/:appointmentId/cancel")
//   .put(
//     verifyToken as RequestHandler,
//     checkRole("doctor") as RequestHandler,
//     cancelClinicAppointment as RequestHandler
//   );
// OTP management routes
// router
//   .route("/appointment/clinic/:appointmentId/otp")
//   .get(
//     verifyToken as RequestHandler,
//     checkRole("patient") as RequestHandler,
//     getAppointmentOTP as RequestHandler
//   );
router
    .route("/appointment/clinic/validate-visit")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), clinic_appointment_1.validateVisitOTP);
exports.default = router;
