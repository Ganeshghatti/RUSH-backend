import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import {
  bookOnlineAppointment,
  getDoctorAppointments,
  getPatientAppointments,
  updateAppointmentStatus,
  getDoctorAppointmentByDate,
  finalPayment,
  createRoomAccessToken,
} from "../../controller/appointment/online-appointment";
import { RequestHandler } from "express";

const router = Router();

// Route for patients to book online appointments
router
  .route("/appointment/online/book")
  .post(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    bookOnlineAppointment as RequestHandler
  );

// Route to initate the final payment process
router
  .route("/appointment/online/finish-payment")
  .post(verifyToken as RequestHandler, finalPayment as RequestHandler);

// Route for doctors to get all their appointments
router
  .route("/appointment/online/doctor")
  .get(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getDoctorAppointments as RequestHandler
  );

// Route for doctors to get appointments by specific date
router
  .route("/appointment/online/doctor/by-date")
  .post(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getDoctorAppointmentByDate as RequestHandler
  );

// Route for patients to get all their appointments
router
  .route("/appointment/online/patient")
  .get(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    getPatientAppointments as RequestHandler
  );

// Route for doctors to update appointment status
router
  .route("/appointment/online/:appointmentId/status")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    updateAppointmentStatus as RequestHandler
  );

// Route for patient to cancel the appointment
// router
//   .route("/appointment/online/cancel/:appointmentId")
//   .put(verifyToken as RequestHandler, cancelAppointment as RequestHandler);

// Route to create access token for doctor and patient
router
  .route("/appointment/online/access-token")
  .post(verifyToken as RequestHandler, createRoomAccessToken as RequestHandler);

export default router;
