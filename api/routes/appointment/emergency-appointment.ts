import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import {
  createEmergencyAppointment,
  getAllEmergencyAppointments,
  getPatientEmergencyAppointments,
  acceptEmergencyAppointment,
  createEmergencyRoomAccessToken,
  finalPayment,
} from "../../controller/appointment/emergency-appointment";
import { RequestHandler } from "express";

const router = Router();

// Route for patients to book emergency appointments (same pattern as online/clinic/home-visit)
router
  .route("/book")
  .post(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    createEmergencyAppointment as RequestHandler
  );

// Route to initiate the final payment process
router
  .route("/finish-payment")
  .post(verifyToken as RequestHandler, finalPayment as RequestHandler);

// Route for creating access token for video room (same path as online)
router
  .route("/access-token")
  .post(
    verifyToken as RequestHandler,
    createEmergencyRoomAccessToken as RequestHandler
  );

// Route for doctors to accept emergency appointment (same param pattern as home-visit)
router
  .route("/:appointmentId/accept")
  .put(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    acceptEmergencyAppointment as RequestHandler
  );

// Emergency-specific: get all emergency appointments (doctor)
router
  .route("/all")
  .get(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getAllEmergencyAppointments as RequestHandler
  );

// Emergency-specific: get patient's emergency appointments
router
  .route("/patient")
  .get(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    getPatientEmergencyAppointments as RequestHandler
  );

export default router; 