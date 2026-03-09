"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const emergency_appointment_1 = require("../../controller/appointment/emergency-appointment");
const router = (0, express_1.Router)();
// Route for patients to book emergency appointments (same pattern as online/clinic/home-visit)
router
    .route("/book")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), emergency_appointment_1.createEmergencyAppointment);
// Route to initiate the final payment process
router
    .route("/finish-payment")
    .post(auth_middleware_1.verifyToken, emergency_appointment_1.finalPayment);
// Route for creating access token for video room (same path as online)
router
    .route("/access-token")
    .post(auth_middleware_1.verifyToken, emergency_appointment_1.createEmergencyRoomAccessToken);
// Route for doctors to accept emergency appointment (same param pattern as home-visit)
router
    .route("/:appointmentId/accept")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), emergency_appointment_1.acceptEmergencyAppointment);
// Emergency-specific: get all emergency appointments (doctor)
router
    .route("/all")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), emergency_appointment_1.getAllEmergencyAppointments);
// Emergency-specific: get patient's emergency appointments
router
    .route("/patient")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), emergency_appointment_1.getPatientEmergencyAppointments);
exports.default = router;
