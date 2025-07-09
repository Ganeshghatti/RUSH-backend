import { getAllDoctors, updateDoctorStatus, updateDocumentVerificationStatus, getAllPatients } from './../../controller/admin/admin';
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";

const router = Router();

router.route("/admin/doctors").get(verifyToken, checkRole("admin"), getAllDoctors);
router.route("/admin/patients").get(verifyToken, checkRole("admin"), getAllPatients);
router.route("/admin/doctor/verification/:doctorId").put(verifyToken, checkRole("admin"), updateDoctorStatus);
router.route("/admin/user/verification/:userId").put(verifyToken, checkRole("admin"), updateDocumentVerificationStatus);

export default router;