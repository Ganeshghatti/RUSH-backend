"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const emergency_appointment_1 = require("../../controller/appointment/emergency-appointment");
const router = (0, express_1.Router)();
// Route for patients to create emergency appointments
router.route("/appointment/emergency")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), emergency_appointment_1.createEmergencyAppointment);
// Route to initate the final payment process
router
    .route("/appointment/emergency/finish-payment")
    .post(auth_middleware_1.verifyToken, emergency_appointment_1.finalPayment);
// Route to get all emergency appointments (for admin/staff)
router.route("/appointment/emergency/all")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), emergency_appointment_1.getAllEmergencyAppointments);
// Route for patients to get their emergency appointments
router.route("/appointment/emergency/patient")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), emergency_appointment_1.getPatientEmergencyAppointments);
// Route for doctors to accept emergency appointments
router.route("/appointment/emergency/accept/:id")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), emergency_appointment_1.acceptEmergencyAppointment);
// Route for creating access token for emergency appointment room
router.route("/appointment/emergency/token")
    .post(auth_middleware_1.verifyToken, emergency_appointment_1.createEmergencyRoomAccessToken);
exports.default = router;
