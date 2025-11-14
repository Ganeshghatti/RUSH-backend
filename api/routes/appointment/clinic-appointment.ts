import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
// import {
//   getDoctorClinicAvailability,
//   confirmClinicAppointment,
//   cancelClinicAppointment,
//   getAppointmentOTP,
//   validateVisitOTP,
// } from "../../controller/appointment/clinic-appointment";
import { updateClinicDetails, bookClinicAppointment, getPatientClinicAppointments, getDoctorClinicAppointments, acceptClinicAppointment, validateVisitOTP } from "../../controller/appointment/clinic-appointment";
import { RequestHandler } from "express";

const router = Router();

// update clinic details
router.patch(
  "/doctor/clinics",
  verifyToken as RequestHandler,
  checkRole("doctor") as RequestHandler,
  updateClinicDetails as RequestHandler
);

// Patient clinic appointment booking routes
// router
//   .route("/appointment/clinic/doctor/:doctorId")
//   .get(getDoctorClinicAvailability as RequestHandler);

router
  .route("/appointment/clinic/book")
  .post(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    bookClinicAppointment as RequestHandler
  );

// Patient clinic appointments
router
  .route("/appointment/clinic/patient")
  .get(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    getPatientClinicAppointments as RequestHandler
  );

// Doctor clinic appointments
router
  .route("/appointment/clinic/doctor")
  .get(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getDoctorClinicAppointments as RequestHandler
  );

// Confirm appointment (Doctor only)
router
  .route("/appointment/clinic/:appointmentId/confirm")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    acceptClinicAppointment as RequestHandler
  );

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
  .post(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    validateVisitOTP as RequestHandler
  );

export default router;
