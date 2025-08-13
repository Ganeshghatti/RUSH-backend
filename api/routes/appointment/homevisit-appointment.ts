import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { RequestHandler } from "express";
import {
  bookHomeVisitAppointment,
  acceptHomeVisitRequest,
  confirmHomeVisitAppointment,
  completeHomeVisitAppointment,
  cancelHomeVisitAppointment,
  getDoctorHomeVisitAppointmentByDate,
  updateHomeVisitConfig,
} from "../../controller/appointment/homevisit-appointment";

const router = Router();

// Patient: book (Step 1)
router.post(
  "/appointment/homevisit/book",
  verifyToken as RequestHandler,
  checkRole("patient") as RequestHandler,
  bookHomeVisitAppointment as RequestHandler
);

// Doctor: accept + add travel cost (Step 2)
router.put(
  "/appointment/homevisit/:appointmentId/accept",
  verifyToken as RequestHandler,
  checkRole("doctor") as RequestHandler,
  acceptHomeVisitRequest as RequestHandler
);

// Patient: confirm + freeze payment (Step 3)
router.put(
  "/appointment/homevisit/:appointmentId/confirm",
  verifyToken as RequestHandler,
  checkRole("patient") as RequestHandler,
  confirmHomeVisitAppointment as RequestHandler
);

// Doctor: complete with OTP (Step 4)
router.put(
  "/appointment/homevisit/:appointmentId/complete",
  verifyToken as RequestHandler,
  checkRole("doctor") as RequestHandler,
  completeHomeVisitAppointment as RequestHandler
);

// Patient or Doctor: cancel
router.put(
  "/appointment/homevisit/:appointmentId/cancel",
  verifyToken as RequestHandler,
  cancelHomeVisitAppointment as RequestHandler
);

// Doctor: appointments by date
router.post(
  "/appointment/homevisit/doctor/by-date",
  verifyToken as RequestHandler,
  checkRole("doctor") as RequestHandler,
  getDoctorHomeVisitAppointmentByDate as RequestHandler
);

// Doctor: update home visit configuration
router.put(
  "/appointment/homevisit/config",
  verifyToken as RequestHandler,
  checkRole("doctor") as RequestHandler,
  updateHomeVisitConfig as RequestHandler
);

export default router;
