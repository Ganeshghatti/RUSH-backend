"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const homevisit_appointment_1 = require("../../controller/appointment/homevisit-appointment");
const router = (0, express_1.Router)();
// Patient: book (Step 1)
router.post("/book", auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), homevisit_appointment_1.bookHomeVisitAppointment);
// Doctor: confirm (accept + travel cost) or cancel (reject) (Step 2)
router.put("/:appointmentId/accept", auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), homevisit_appointment_1.confirmHomeVisitRequest);
// Patient: confirm + freeze payment (Step 3)
router.put("/:appointmentId/confirm", auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), homevisit_appointment_1.confirmHomeVisitAppointment);
// Doctor: complete with OTP (Step 4)
router.put("/:appointmentId/complete", auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), homevisit_appointment_1.completeHomeVisitAppointment);
// Use generic POST /appointment/doctor/by-date for doctor's appointments by date (all types)
exports.default = router;
