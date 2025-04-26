import { doctorOnboard } from './../../controller/doctor/doctor';
import { verifyToken } from "../../middleware/auth-middleware";
import { Router } from "express";

const router = Router();

router.route("/onboard/:userId").put(verifyToken, doctorOnboard);

export default router;