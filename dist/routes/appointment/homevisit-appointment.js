"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const homevisit_appointment_1 = require("../../controller/appointment/homevisit-appointment");
const router = (0, express_1.Router)();
// Patient: book (Step 1)
router.post("/appointment/homevisit/book", auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), homevisit_appointment_1.bookHomeVisitAppointment);
// Doctor: accept + add travel cost (Step 2)
router.put("/appointment/homevisit/:appointmentId/accept", auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), homevisit_appointment_1.acceptHomeVisitRequest);
// Patient: confirm + freeze payment (Step 3)
router.put("/appointment/homevisit/:appointmentId/confirm", auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), homevisit_appointment_1.confirmHomeVisitAppointment);
// Doctor: complete with OTP (Step 4)
router.put("/appointment/homevisit/:appointmentId/complete", auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), homevisit_appointment_1.completeHomeVisitAppointment);
// Patient or Doctor: cancel
// router.put(
//   "/appointment/homevisit/:appointmentId/cancel",
//   verifyToken as RequestHandler,
//   cancelHomeVisitAppointment as RequestHandler
// );
// Doctor: appointments by date
router.post("/appointment/homevisit/doctor/by-date", auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), homevisit_appointment_1.getDoctorHomeVisitAppointmentByDate);
exports.default = router;
