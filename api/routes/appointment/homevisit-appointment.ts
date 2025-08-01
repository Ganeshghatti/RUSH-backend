import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import {
  bookHomeVisitAppointment,
  updateHomeVisitAppointmentStatus,
  getDoctorHomeVisitAppointmentByDate,
  completeHomeVisitAppointment,
  updateHomeVisitConfig,
} from "../../controller/appointment/homevisit-appointment";
import { RequestHandler } from "express";

const router = Router();

// Route for patients to book home visit appointments
router
  .route("/appointment/homevisit/book")
  .post(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    bookHomeVisitAppointment as RequestHandler
  );

// Route for doctors to get home visit appointments by specific date
router
  .route("/appointment/homevisit/doctor/by-date")
  .post(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getDoctorHomeVisitAppointmentByDate as RequestHandler
  );

// Route for doctors to update appointment status (accept/reject)
router
  .route("/appointment/homevisit/:appointmentId/status")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    updateHomeVisitAppointmentStatus as RequestHandler
  );

// Route for doctors to complete appointment with OTP validation
router
  .route("/appointment/homevisit/:appointmentId/complete")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    completeHomeVisitAppointment as RequestHandler
  );

// Route for doctors to update home visit configuration
router
  .route("/doctor/homevisit/config")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    updateHomeVisitConfig as RequestHandler
  );

export default router;
