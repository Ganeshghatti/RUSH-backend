import { doctorOnboard } from './../../controller/doctor/doctor';
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";

const router = Router();

router.route("/onboard/doctor/:userId").put(verifyToken, checkRole("doctor"), doctorOnboard);

export default router;