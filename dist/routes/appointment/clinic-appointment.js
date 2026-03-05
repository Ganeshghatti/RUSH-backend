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
// Patient books clinic appointment (use generic GET /appointment/patient for listing all types)
router
    .route("/book")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), clinic_appointment_1.bookClinicAppointment);
// Doctor or patient: confirm (doctor accept) or cancel (reject). Doctor can accept or reject; patient can only reject.
router
    .route("/:appointmentId/confirm")
    .put(auth_middleware_1.verifyToken, clinic_appointment_1.confirmClinicAppointment);
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
    .route("/validate-visit")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), clinic_appointment_1.validateVisitOTP);
exports.default = router;
