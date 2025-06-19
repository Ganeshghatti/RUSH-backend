import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { 
  bookOnlineAppointment, 
  getDoctorAppointments,
  getPatientAppointments,
  updateAppointmentStatus,
} from "../../controller/appointment/online-appointment";
import { createTwilioRoom } from "../../controller/appointment/create-room";
import { createRoomAccessToken } from "../../controller/appointment/create-access-token";
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

// Route to create a new twilio room
router.route("/appointment/online/create-room")
  .post(
    verifyToken as RequestHandler,
    // checkRole("doctor") as RequestHandler, // Only doctors can trigger room creation
    createTwilioRoom as RequestHandler
  );

// Route to create access token for doctor and patient
router.route("/appointment/online/access-token")
  .post(
    verifyToken as RequestHandler,
    createRoomAccessToken as RequestHandler
  )

export default router; 