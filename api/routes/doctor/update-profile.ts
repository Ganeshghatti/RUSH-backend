import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { updateDoctorProfile, updateDoctorOnlineAppointment } from "../../controller/doctor/update-profile";
import { RequestHandler } from "express";

const router = Router();

// Route for updating doctor profile (uses req.user.id, no file upload needed)
router.route("/doctor/profile")
  .put(
    verifyToken as RequestHandler, 
    checkRole("doctor") as RequestHandler, 
    updateDoctorProfile as RequestHandler
  );

// Route for updating doctor's online appointment availability (uses doctorId param)
router.route("/doctor/online-appointment/:doctorId")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    updateDoctorOnlineAppointment as RequestHandler
  );

export default router; 