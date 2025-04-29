import { doctorOnboard } from './../../controller/doctor/doctor';
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";
import multer from "multer";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  });

router.route("/onboard/doctor/:userId").put(verifyToken, checkRole("doctor"), doctorOnboard);

export default router;