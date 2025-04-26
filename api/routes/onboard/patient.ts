import { verifyToken } from "../../middleware/auth-middleware";
import { Router } from "express";
import { patientOnboard } from "../../controller/patient/patient";

const router = Router();

router.route("/onboard/:userId").post(verifyToken, patientOnboard);

export default router;