import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { 
  bookOnlineAppointment, 
  getDoctorAppointments,
  getPatientAppointments,
  updateAppointmentStatus,
} from "../../controller/appointment/online-appointment";
import { RequestHandler } from "express";

const router = Router();

// Route for patients to book online appointments
router.route("/appointment/online/book")
  .post(
    verifyToken as RequestHandler, 
    checkRole("patient") as RequestHandler, 
    bookOnlineAppointment as RequestHandler
  );

// Route for doctors to get all their appointments
router.route("/appointment/online/doctor")
  .get(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getDoctorAppointments as RequestHandler
  );

// Route for patients to get all their appointments
router.route("/appointment/online/patient")
  .get(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    getPatientAppointments as RequestHandler
  );

// Route for doctors to update appointment status
router.route("/appointment/online/:appointmentId/status")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    updateAppointmentStatus as RequestHandler
  );

export default router; 