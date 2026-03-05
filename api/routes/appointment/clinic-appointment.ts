import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
// import {
//   getDoctorClinicAvailability,
//   confirmClinicAppointment,
//   cancelClinicAppointment,
//   getAppointmentOTP,
//   validateVisitOTP,
// } from "../../controller/appointment/clinic-appointment";
import { bookClinicAppointment, confirmClinicAppointment, validateVisitOTP } from "../../controller/appointment/clinic-appointment";
import { RequestHandler } from "express";

const router = Router();

// Patient books clinic appointment (use generic GET /appointment/patient for listing all types)
router
  .route("/book")
  .post(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    bookClinicAppointment as RequestHandler
  );

// Doctor or patient: confirm (doctor accept) or cancel (reject). Doctor can accept or reject; patient can only reject.
router
  .route("/:appointmentId/confirm")
  .put(verifyToken as RequestHandler, confirmClinicAppointment as RequestHandler);

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
  .post(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    validateVisitOTP as RequestHandler
  );

export default router;
