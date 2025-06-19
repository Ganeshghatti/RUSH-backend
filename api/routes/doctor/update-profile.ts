import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import {
  updateDoctorProfile,
  updateDoctorOnlineAppointment,
} from "../../controller/doctor/update-profile";
import { RequestHandler } from "express";
import { getAllPatientsForDoctor, getDoctorAppointmentStats } from "../../controller/doctor/doctor";

const router = Router();

// Route for updating doctor profile (uses req.user.id, no file upload needed)
router
  .route("/doctor/profile")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    updateDoctorProfile as RequestHandler
  );

// Route for updating doctor's online appointment availability (uses doctorId param)
router
  .route("/doctor/online-appointment/:doctorId")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    updateDoctorOnlineAppointment as RequestHandler
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

export default router;