import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import {
  bookOnlineAppointment,
  confirmOnlineAppointment,
  finalPayment,
  createRoomAccessToken,
} from "../../controller/appointment/online-appointment";
import { RequestHandler } from "express";

const router = Router();

// Route for patients to book online appointments
router
  .route("/book")
  .post(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    bookOnlineAppointment as RequestHandler
  );

// Route to initiate the final payment process
router
  .route("/finish-payment")
  .post(verifyToken as RequestHandler, finalPayment as RequestHandler);

// Confirm (accept/reject) online appointment: doctor can accept or reject; patient can reject only
router
  .route("/:appointmentId/status")
  .put(verifyToken as RequestHandler, confirmOnlineAppointment as RequestHandler);

// Route to create access token for doctor and patient
router
  .route("/access-token")
  .post(verifyToken as RequestHandler, createRoomAccessToken as RequestHandler);

export default router;
