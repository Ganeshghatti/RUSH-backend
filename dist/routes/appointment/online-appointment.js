"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const online_appointment_1 = require("../../controller/appointment/online-appointment");
const router = (0, express_1.Router)();
// Route for patients to book online appointments
router
    .route("/appointment/online/book")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), online_appointment_1.bookOnlineAppointment);
// Route to initate the final payment process
router
    .route("/appointment/online/finish-payment")
    .post(auth_middleware_1.verifyToken, online_appointment_1.finalPayment);
// Route for doctors to get all their appointments
router
    .route("/appointment/online/doctor")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), online_appointment_1.getDoctorAppointments);
// Route for doctors to get appointments by specific date
router
    .route("/appointment/online/doctor/by-date")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), online_appointment_1.getDoctorAppointmentByDate);
// Route for patients to get all their appointments
router
    .route("/appointment/online/patient")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), online_appointment_1.getPatientAppointments);
// Route for doctors to update appointment status
router
    .route("/appointment/online/:appointmentId/status")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), online_appointment_1.updateAppointmentStatus);
// Route for patient to cancel the appointment
// router
//   .route("/appointment/online/cancel/:appointmentId")
//   .put(verifyToken as RequestHandler, cancelAppointment as RequestHandler);
// Route to create access token for doctor and patient
router
    .route("/appointment/online/access-token")
    .post(auth_middleware_1.verifyToken, online_appointment_1.createRoomAccessToken);
exports.default = router;
