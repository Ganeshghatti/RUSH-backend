import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import {
  addClinic,
  getDoctorClinics,
  updateClinic,
  deleteClinic,
  getDoctorClinicAvailability,
  bookClinicAppointment,
  confirmClinicAppointment,
  cancelClinicAppointment,
  getPatientClinicAppointments,
  getDoctorClinicAppointments,
  getAppointmentOTP,
  validateVisitOTP,
} from "../../controller/appointment/clinic-appointment";
import { RequestHandler } from "express";

const router = Router();

// Doctor clinic management routes
router
  .route("/doctor/clinic")
  .post(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    addClinic as RequestHandler
  )
  .get(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getDoctorClinics as RequestHandler
  );

router
  .route("/doctor/clinic/:clinicId")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    updateClinic as RequestHandler
  )
  .delete(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    deleteClinic as RequestHandler
  );

// Patient clinic appointment booking routes
router
  .route("/appointment/clinic/doctor/:doctorId")
  .get(getDoctorClinicAvailability as RequestHandler);

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
    confirmClinicAppointment as RequestHandler
  );

// Cancel appointment (Doctor only)
router
  .route("/appointment/clinic/:appointmentId/cancel")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    cancelClinicAppointment as RequestHandler
  );

// OTP management routes
router
  .route("/appointment/clinic/:appointmentId/otp")
  .get(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    getAppointmentOTP as RequestHandler
  );

router
  .route("/appointment/clinic/validate-visit")
  .post(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    validateVisitOTP as RequestHandler
  );

export default router;
