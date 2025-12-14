import { Router, RequestHandler } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import {
  getPrescriptionById,
  addPrescription,
} from "../../controller/appointment/prescription";

const router = Router();

// get prescription by it's id
router
  .route("/appointment/prescription/:prescriptionId")
  .get(verifyToken as RequestHandler, getPrescriptionById as RequestHandler);

// doctor can add prescription
router
  .route("/doctor/add-prescription")
  .post(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    addPrescription as RequestHandler
  );

export default router;
