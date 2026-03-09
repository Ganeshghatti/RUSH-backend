"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const online_appointment_1 = require("../../controller/appointment/online-appointment");
const router = (0, express_1.Router)();
// Route for patients to book online appointments
router
    .route("/book")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), online_appointment_1.bookOnlineAppointment);
// Route to initiate the final payment process
router
    .route("/finish-payment")
    .post(auth_middleware_1.verifyToken, online_appointment_1.finalPayment);
// Confirm (accept/reject) online appointment: doctor can accept or reject; patient can reject only
router
    .route("/:appointmentId/status")
    .put(auth_middleware_1.verifyToken, online_appointment_1.confirmOnlineAppointment);
// Route to create access token for doctor and patient
router
    .route("/access-token")
    .post(auth_middleware_1.verifyToken, online_appointment_1.createRoomAccessToken);
exports.default = router;
