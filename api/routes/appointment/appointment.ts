import { Router, RequestHandler } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import {
  getDoctorAppointments,
  getPatientAppointments,
  getDoctorAppointmentByDate,
} from "../../controller/appointment/appointment";

const router = Router();

/** GET all appointments for the logged-in doctor (online, emergency, clinic, home visit) */
router
  .route("/doctor")
  .get(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getDoctorAppointments as RequestHandler
  );

/** POST get doctor's appointments filtered by date (body: { date: "YYYY-MM-DD" }) */
router
  .route("/doctor/by-date")
  .post(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getDoctorAppointmentByDate as RequestHandler
  );

/** GET all appointments for the logged-in patient (online, emergency, clinic, home visit) */
router
  .route("/patient")
  .get(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    getPatientAppointments as RequestHandler
  );

export default router;
