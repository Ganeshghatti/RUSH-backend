import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";
import { patientOnboard } from "../../controller/patient/patient";

const router = Router();

router.route("/onboard/patient/:userId").put(verifyToken, checkRole("patient"), patientOnboard);

export default router;