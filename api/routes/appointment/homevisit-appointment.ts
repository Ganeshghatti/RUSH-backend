import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { RequestHandler } from "express";
import {
  bookHomeVisitAppointment,
  confirmHomeVisitRequest,
  confirmHomeVisitAppointment,
  completeHomeVisitAppointment,
} from "../../controller/appointment/homevisit-appointment";

const router = Router();

// Patient: book (Step 1)
router.post(
  "/book",
  verifyToken as RequestHandler,
  checkRole("patient") as RequestHandler,
  bookHomeVisitAppointment as RequestHandler
);

// Doctor: confirm (accept + travel cost) or cancel (reject) (Step 2)
router.put(
  "/:appointmentId/accept",
  verifyToken as RequestHandler,
  checkRole("doctor") as RequestHandler,
  confirmHomeVisitRequest as RequestHandler
);

// Patient: confirm + freeze payment (Step 3)
router.put(
  "/:appointmentId/confirm",
  verifyToken as RequestHandler,
  checkRole("patient") as RequestHandler,
  confirmHomeVisitAppointment as RequestHandler
);

// Doctor: complete with OTP (Step 4)
router.put(
  "/:appointmentId/complete",
  verifyToken as RequestHandler,
  checkRole("doctor") as RequestHandler,
  completeHomeVisitAppointment as RequestHandler
);

// Use generic POST /appointment/doctor/by-date for doctor's appointments by date (all types)

export default router;
