import { getAllDoctors, updateDoctorStatus } from './../../controller/admin/admin';
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";

const router = Router();

router.route("/admin/doctors").get(verifyToken, checkRole("admin"), getAllDoctors);
router.route("/admin/doctor/:doctorId").put(verifyToken, checkRole("admin"), updateDoctorStatus);

export default router;