import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { updateAppointmentSettings } from "../../controller/doctor/appointment-settings";
import { RequestHandler } from "express";
import {
  getAllPatientsForDoctor,
  getDoctorAppointmentStats,
  getDoctorDashboard,
  updateDoctorActiveStatus,
} from "../../controller/doctor/doctor";
import { getDoctorEarnings } from "../../controller/doctor/earning";

const router = Router();

// Single route: update any of the 3 appointment-type settings (online, clinic, homeVisit)
router
  .route("/doctor/appointment-settings")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    updateAppointmentSettings as RequestHandler
  );

router
  .route("/doctor/patients")
  .get(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getAllPatientsForDoctor as RequestHandler
  );

// Route for getting doctor appointment statistics and counts
router
  .route("/doctor/appointments/stats")
  .get(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getDoctorAppointmentStats as RequestHandler
  );

// Route for getting doctor dashboard data
router
  .route("/doctor/dashboard")
  .get(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getDoctorDashboard as RequestHandler
  );

// Route for updating doctor active status
router
  .route("/doctor/active-status")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    updateDoctorActiveStatus as RequestHandler
  );

// Route for getting doctor earnings
router
  .route("/doctor/earnings")
  .get(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getDoctorEarnings as RequestHandler
  );

export default router;
