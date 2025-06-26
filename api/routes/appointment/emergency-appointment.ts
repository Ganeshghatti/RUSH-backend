import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { 
  createEmergencyAppointment,
  getAllEmergencyAppointments,
  getPatientEmergencyAppointments,
  acceptEmergencyAppointment,
} from "../../controller/appointment/emergency-appointment";
import { createEmergencyRoomAccessToken } from "../../controller/appointment/create-emergency-token";
import { RequestHandler } from "express";

const router = Router();

// Route for patients to create emergency appointments
router.route("/appointment/emergency")
  .post(
    verifyToken as RequestHandler, 
    checkRole("patient") as RequestHandler, 
    createEmergencyAppointment as RequestHandler
  );

// Route to get all emergency appointments (for admin/staff)
router.route("/appointment/emergency/all")
  .get(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getAllEmergencyAppointments as RequestHandler
  );

// Route for patients to get their emergency appointments
router.route("/appointment/emergency/patient")
  .get(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    getPatientEmergencyAppointments as RequestHandler
  );

// Route for doctors to accept emergency appointments
router.route("/appointment/emergency/accept/:id")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    acceptEmergencyAppointment as RequestHandler
  );

// Route for creating access token for emergency appointment room
router.route("/appointment/emergency/token")
  .post(
    verifyToken as RequestHandler,
    createEmergencyRoomAccessToken as RequestHandler
  );

export default router; 